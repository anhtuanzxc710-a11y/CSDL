from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
from datetime import datetime

from app.core.deps import get_current_active_user
from app.models.user import User
from app.core.optimizer_engine import OptimizerEngine
from app.core.backtest_engine import BacktestEngine
from app.core.logging_config import generate_request_id, log_exception, Timer
from app.core.errors import QuantErrorCode, build_success_response
from main import sanitize_floats

router = APIRouter()

class Constraints(BaseModel):
    long_only: bool = True
    min_weight: float = 0.0
    max_weight: float = 1.0

class OptimizeRequest(BaseModel):
    symbols: List[str]
    start_date: str
    end_date: str
    initial_capital: float = 100000000.0
    optimizer: str = "max_sharpe"
    risk_free_rate: float = 0.03
    constraints: Optional[Constraints] = None
    covariance_method: str = "sample"
    benchmark: str = "VN30"

class OptimizeAndBacktestRequest(BaseModel):
    symbols: List[str]
    start_date: str
    end_date: str
    optimizer: str = "max_sharpe"
    rebalance_frequency: str = "monthly"
    transaction_cost_bps: float = 15.0
    slippage_bps: float = 10.0
    benchmark: str = "VN30"
    initial_capital: float = 100000000.0
    risk_free_rate: float = 0.03
    constraints: Optional[Constraints] = None
    covariance_method: str = "sample"

@router.post("/optimize")
def run_optimize(
    req: OptimizeRequest,
    current_user: User = Depends(get_current_active_user)
):
    request_id = generate_request_id()

    # Input validations
    if not req.symbols or len(req.symbols) == 0:
        raise HTTPException(status_code=400, detail="Danh sách mã cổ phiếu không được rỗng.")

    if len(req.symbols) > 20:
        raise HTTPException(status_code=400, detail="Chỉ cho phép tối đa 20 mã cổ phiếu để chạy tối ưu hóa.")

    if req.initial_capital <= 0:
        raise HTTPException(status_code=400, detail="Vốn đầu tư ban đầu phải lớn hơn 0.")

    # Validations for optimizer and covariance method
    valid_optimizers = {"equal_weight", "min_variance", "max_sharpe", "mean_variance", "risk_parity"}
    if req.optimizer not in valid_optimizers:
        raise HTTPException(status_code=400, detail=f"Phương thức tối ưu hóa '{req.optimizer}' không hợp lệ. Phải thuộc {list(valid_optimizers)}.")

    valid_cov_methods = {"sample", "ledoit_wolf"}
    if req.covariance_method not in valid_cov_methods:
        raise HTTPException(status_code=400, detail=f"Phương thức tính hiệp phương sai '{req.covariance_method}' không hợp lệ. Phải thuộc {list(valid_cov_methods)}.")

    # Parse constraints
    min_w = 0.0
    max_w = 1.0
    if req.constraints:
        if req.constraints.min_weight < 0:
            raise HTTPException(status_code=400, detail="Tỷ trọng tối thiểu (min_weight) không được âm.")
        if req.constraints.max_weight > 1.0:
            raise HTTPException(status_code=400, detail="Tỷ trọng tối đa (max_weight) không được lớn hơn 1.0.")
        if req.constraints.min_weight > req.constraints.max_weight:
            raise HTTPException(status_code=400, detail="Tỷ trọng tối thiểu phải nhỏ hơn hoặc bằng tỷ trọng tối đa.")
        min_w = req.constraints.min_weight
        max_w = req.constraints.max_weight

    # Date range check
    try:
        start_dt = pd.to_datetime(req.start_date)
        end_dt = pd.to_datetime(req.end_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

    duration_years = (end_dt - start_dt).days / 365.25
    if duration_years > 10.0:
        raise HTTPException(status_code=400, detail="Khoảng thời gian tối ưu hóa không được vượt quá 10 năm.")

    timer = Timer()
    try:
        with timer:
            engine = OptimizerEngine(
                symbols=req.symbols,
                start_date=req.start_date,
                end_date=req.end_date,
                optimizer=req.optimizer,
                initial_capital=req.initial_capital,
                risk_free_rate=req.risk_free_rate,
                min_weight=min_w,
                max_weight=max_w,
                covariance_method=req.covariance_method,
                benchmark=req.benchmark,
                request_id=request_id
            )
            res = engine.run()
    except ValueError as e:
        log_exception(request_id, "VALIDATION_ERROR", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_exception(request_id, "INTERNAL_ERROR", str(e))
        raise HTTPException(status_code=500, detail=f"Lỗi tối ưu hóa danh mục: {str(e)}")

    meta = {
        "request_id": request_id,
        "execution_time_ms": round(timer.elapsed_ms, 2),
    }

    result = build_success_response(res, meta=meta)
    return sanitize_floats(result)

@router.post("/optimize-and-backtest")
def run_optimize_and_backtest(
    req: OptimizeAndBacktestRequest,
    current_user: User = Depends(get_current_active_user)
):
    request_id = generate_request_id()

    # Reuse validations from optimizer
    if not req.symbols or len(req.symbols) == 0:
        raise HTTPException(status_code=400, detail="Danh sách mã cổ phiếu không được rỗng.")

    if len(req.symbols) > 20:
        raise HTTPException(status_code=400, detail="Chỉ cho phép tối đa 20 mã cổ phiếu để chạy tối ưu hóa và backtest.")

    if req.initial_capital <= 0:
        raise HTTPException(status_code=400, detail="Vốn đầu tư ban đầu phải lớn hơn 0.")

    valid_optimizers = {"equal_weight", "min_variance", "max_sharpe", "mean_variance", "risk_parity"}
    if req.optimizer not in valid_optimizers:
        raise HTTPException(status_code=400, detail=f"Phương thức tối ưu hóa '{req.optimizer}' không hợp lệ.")

    # Constraints
    min_w = 0.0
    max_w = 1.0
    if req.constraints:
        min_w = req.constraints.min_weight
        max_w = req.constraints.max_weight

    # Date range
    try:
        start_dt = pd.to_datetime(req.start_date)
        end_dt = pd.to_datetime(req.end_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

    timer = Timer()
    try:
        with timer:
            # 1. Optimize portfolio to get target weights
            opt_engine = OptimizerEngine(
                symbols=req.symbols,
                start_date=req.start_date,
                end_date=req.end_date,
                optimizer=req.optimizer,
                initial_capital=req.initial_capital,
                risk_free_rate=req.risk_free_rate,
                min_weight=min_w,
                max_weight=max_w,
                covariance_method=req.covariance_method,
                benchmark=req.benchmark,
                request_id=request_id
            )
            opt_res = opt_engine.run()
            
            # 2. Extract weights
            target_weights = opt_res["weights"]
            
            # 3. Backtest using Phase 3 engine under custom_weight
            bt_engine = BacktestEngine(
                symbols=req.symbols,
                start_date=req.start_date,
                end_date=req.end_date,
                initial_capital=req.initial_capital,
                weighting_method="custom_weight",
                rebalance_frequency=req.rebalance_frequency,
                transaction_cost_bps=req.transaction_cost_bps,
                slippage_bps=req.slippage_bps,
                benchmark=req.benchmark,
                risk_free_rate=req.risk_free_rate,
                custom_weights=target_weights,
                request_id=request_id
            )
            bt_res = bt_engine.run()
    except ValueError as e:
        log_exception(request_id, "VALIDATION_ERROR", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_exception(request_id, "INTERNAL_ERROR", str(e))
        raise HTTPException(status_code=500, detail=f"Lỗi tối ưu hóa và backtest: {str(e)}")

    meta = {
        "request_id": request_id,
        "execution_time_ms": round(timer.elapsed_ms, 2),
    }

    combined_res = {
        "success": True,
        "optimizer": opt_res,
        "backtest": bt_res
    }

    return sanitize_floats(build_success_response(combined_res, meta=meta))
