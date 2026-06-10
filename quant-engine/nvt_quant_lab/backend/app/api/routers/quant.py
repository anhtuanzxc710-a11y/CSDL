from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from datetime import datetime

from core.portfolio_opt import calculate_advanced_metrics
from app.core.deps import get_current_active_user
from app.models.user import User
from main import sanitize_floats

# ── Phase 2 Imports: Resilience, Errors, Logging ─────────────────────────────
from app.core.resilience import prepare_portfolio_data_resilient
from app.core.errors import QuantErrorCode, build_error_response, build_success_response
from app.core.logging_config import (
    generate_request_id, log_analysis_started, log_analysis_completed,
    log_exception, Timer
)

router = APIRouter()

class QuantAnalyzeRequest(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    capital: float = 1000000000.0  # 1 Billion VND default
    risk_free_rate: float = 0.03

@router.post("/analyze")
def analyze_quant(
    req: QuantAnalyzeRequest,
    current_user: User = Depends(get_current_active_user)
):
    # ── Generate Request ID for tracing ──
    request_id = generate_request_id()

    if not req.tickers or len(req.tickers) == 0:
        raise HTTPException(status_code=400, detail="Danh sách mã cổ phiếu không được rỗng.")

    if req.capital <= 0:
        raise HTTPException(status_code=400, detail="Vốn đầu tư ban đầu phải lớn hơn 0.")

    # 1. Fetch data with resilience
    tickers_upper = [t.strip().upper() for t in req.tickers if t.strip()]
    if len(tickers_upper) == 0:
        raise HTTPException(status_code=400, detail="Mã cổ phiếu không hợp lệ.")

    # ── Log analysis start ──
    log_analysis_started(request_id, tickers_upper, req.start_date, req.end_date)
    timer = Timer()

    try:
        with timer:
            # Phase 2: Use resilient data fetching with benchmark fallback
            port_ret, mkt_ret, benchmark_source, is_degraded = prepare_portfolio_data_resilient(
                tickers_upper, days_back=1000, request_id=request_id
            )
    except Exception as e:
        log_exception(request_id, "DATA_FETCH_ERROR", str(e))
        raise HTTPException(status_code=500, detail=f"Lỗi tải dữ liệu giá: {str(e)}")

    available_tickers = list(port_ret.columns) if not port_ret.empty else []
    if len(available_tickers) == 0:
        raise HTTPException(status_code=400, detail="Không lấy được dữ liệu cho các mã cổ phiếu này.")

    # 2. Lọc theo khoảng thời gian
    try:
        start_dt = pd.to_datetime(req.start_date)
        end_dt = pd.to_datetime(req.end_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

    # Đảm bảo timezone-naive để so sánh với index của port_ret (nếu index naive)
    if start_dt.tzinfo is not None:
        start_dt = start_dt.tz_localize(None)
    if end_dt.tzinfo is not None:
        end_dt = end_dt.tz_localize(None)

    port_ret_filtered = port_ret.loc[start_dt:end_dt]
    mkt_ret_filtered = mkt_ret.loc[start_dt:end_dt]

    if len(port_ret_filtered) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Dữ liệu trong khoảng thời gian đã chọn quá ít (chỉ có {len(port_ret_filtered)} phiên). Vui lòng chọn khoảng thời gian rộng hơn."
        )

    # 3. Tính toán Equal-Weights portfolio
    n_assets = len(port_ret_filtered.columns)
    weights = np.ones(n_assets) / n_assets
    weights_dict = dict(zip(port_ret_filtered.columns, weights))

    daily_port_returns = port_ret_filtered.dot(weights)

    # 4. Tính toán Advanced Metrics
    try:
        adv_metrics = calculate_advanced_metrics(daily_port_returns, mkt_ret_filtered)
    except Exception as e:
        log_exception(request_id, "INTERNAL_ERROR", f"Metric calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tính toán chỉ số danh mục: {str(e)}")

    # 5. Correlation Matrix
    try:
        corr_matrix = port_ret_filtered.corr().fillna(0).to_dict()
    except Exception:
        corr_matrix = {t: {t2: 1.0 if t == t2 else 0.0 for t2 in available_tickers} for t in available_tickers}

    # 6. Equity Curve và Drawdown
    cum_returns = np.exp(daily_port_returns.cumsum()) - 1
    running_max = (cum_returns + 1).cummax()
    drawdown = ((cum_returns + 1) - running_max) / running_max

    dates = [d.strftime("%Y-%m-%d") for d in cum_returns.index]
    equity_curve_list = cum_returns.fillna(0).tolist()
    drawdown_list = drawdown.fillna(0).tolist()

    # Annualized Sharpe ratio với risk free rate người dùng chỉ định
    ann_return = adv_metrics.get("annualized_return", 0.0)
    ann_vol = adv_metrics.get("annualized_volatility", 0.0)
    sharpe_ratio = (ann_return - req.risk_free_rate) / ann_vol if ann_vol > 0 else 0.0

    res = {
        "tickers": list(port_ret_filtered.columns),
        "weights": weights_dict,
        "metrics": {
            "expected_return": ann_return,
            "volatility": ann_vol,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": adv_metrics.get("max_drawdown", 0.0),
            "beta": adv_metrics.get("beta", 1.0),
            "sortino": adv_metrics.get("sortino", 0.0),
            "treynor": adv_metrics.get("treynor", 0.0),
            "calmar": adv_metrics.get("calmar", 0.0)
        },
        "correlation_matrix": corr_matrix,
        "charts": {
            "dates": dates,
            "equity_curve": equity_curve_list,
            "drawdown": drawdown_list
        }
    }

    # ── Phase 2: Add metadata ──
    meta = {
        "request_id": request_id,
        "benchmark_source": benchmark_source,
        "is_degraded": is_degraded,
        "execution_time_ms": round(timer.elapsed_ms, 2),
    }

    # ── Log completion ──
    log_analysis_completed(
        request_id, timer.elapsed_ms, len(available_tickers),
        is_degraded=is_degraded, benchmark_source=benchmark_source
    )

    result = build_success_response(res, meta=meta)
    return sanitize_floats(result)
