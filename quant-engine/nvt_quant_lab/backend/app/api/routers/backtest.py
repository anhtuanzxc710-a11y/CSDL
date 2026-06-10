from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
from datetime import datetime

from app.core.deps import get_current_active_user
from app.models.user import User
from app.core.backtest_engine import BacktestEngine
from app.core.logging_config import generate_request_id, log_exception, Timer
from app.core.errors import QuantErrorCode, build_success_response
from main import sanitize_floats

router = APIRouter()

class BacktestRequest(BaseModel):
    symbols: List[str]
    start_date: str
    end_date: str
    initial_capital: float
    weighting_method: str
    rebalance_frequency: str
    transaction_cost_bps: float
    slippage_bps: float
    benchmark: str = "VN30"
    risk_free_rate: float = 0.03
    weights: Optional[Dict[str, float]] = None

@router.post("/backtest")
def run_backtest(
    req: BacktestRequest,
    current_user: User = Depends(get_current_active_user)
):
    request_id = generate_request_id()

    # Input validations
    if not req.symbols or len(req.symbols) == 0:
        raise HTTPException(status_code=400, detail="Danh sách mã cổ phiếu không được rỗng.")
    
    if len(req.symbols) > 20:
        raise HTTPException(status_code=400, detail="Chỉ cho phép tối đa 20 mã cổ phiếu để chạy backtest.")

    if req.initial_capital <= 0:
        raise HTTPException(status_code=400, detail="Vốn đầu tư ban đầu phải lớn hơn 0.")

    if req.transaction_cost_bps < 0:
        raise HTTPException(status_code=400, detail="Chi phí giao dịch (transaction cost) không được âm.")

    if req.slippage_bps < 0:
        raise HTTPException(status_code=400, detail="Chi phí trượt giá (slippage) không được âm.")

    # Validate weighting method
    valid_weighting = {"equal_weight", "market_cap_placeholder", "custom_weight"}
    if req.weighting_method not in valid_weighting:
        raise HTTPException(
            status_code=400,
            detail=f"Phương thức tính tỷ trọng '{req.weighting_method}' không hợp lệ. Phải thuộc {list(valid_weighting)}."
        )

    # Validate custom weights
    if req.weighting_method == "custom_weight":
        if not req.weights:
            raise HTTPException(status_code=400, detail="Tỷ trọng tùy chỉnh (weights) không được để trống khi chọn custom_weight.")
        
        # Verify all symbols are in weights (case-insensitive check)
        symbols_upper = [s.strip().upper() for s in req.symbols if s.strip()]
        for sym in symbols_upper:
            match = None
            for w_k in req.weights.keys():
                if w_k.strip().upper() == sym:
                    match = w_k
                    break
            if match is None:
                raise HTTPException(status_code=400, detail=f"Thiếu tỷ trọng cho mã cổ phiếu {sym} trong weights.")
        
        # Sum weights
        total_w = sum(req.weights.values())
        if abs(total_w - 1.0) > 1e-4:
            raise HTTPException(status_code=400, detail=f"Tổng tỷ trọng tùy chỉnh phải bằng 1.0 (nhận được {total_w:.4f}).")

    # Validate rebalance frequency
    valid_rebalance = {"none", "monthly", "quarterly", "yearly"}
    if req.rebalance_frequency not in valid_rebalance:
        raise HTTPException(
            status_code=400,
            detail=f"Tần suất tái cơ cấu '{req.rebalance_frequency}' không hợp lệ. Phải thuộc {list(valid_rebalance)}."
        )

    # Validate date range
    try:
        start_dt = pd.to_datetime(req.start_date)
        end_dt = pd.to_datetime(req.end_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

    # Max 10 years check
    duration_years = (end_dt - start_dt).days / 365.25
    if duration_years > 10.0:
        raise HTTPException(status_code=400, detail="Khoảng thời gian chạy backtest không được vượt quá 10 năm.")

    # Execute backtest engine with a timer
    timer = Timer()
    try:
        with timer:
            engine = BacktestEngine(
                symbols=req.symbols,
                start_date=req.start_date,
                end_date=req.end_date,
                initial_capital=req.initial_capital,
                weighting_method=req.weighting_method,
                rebalance_frequency=req.rebalance_frequency,
                transaction_cost_bps=req.transaction_cost_bps,
                slippage_bps=req.slippage_bps,
                benchmark=req.benchmark,
                risk_free_rate=req.risk_free_rate,
                custom_weights=req.weights,
                request_id=request_id
            )
            res = engine.run()
    except ValueError as e:
        log_exception(request_id, "VALIDATION_ERROR", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_exception(request_id, "INTERNAL_ERROR", str(e))
        raise HTTPException(status_code=500, detail=f"Lỗi chạy backtest: {str(e)}")

    meta = {
        "request_id": request_id,
        "execution_time_ms": round(timer.elapsed_ms, 2),
    }

    result = build_success_response(res, meta=meta)
    return sanitize_floats(result)
