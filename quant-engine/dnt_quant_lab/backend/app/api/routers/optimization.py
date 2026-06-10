from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, settings
from app.schemas.optimization import OptimizeRequest, OptimizeResponse
from app.services.optimization_service import PortfolioService as OptimizationService
from app.services.vnstock_provider import VnStockDataProvider

router = APIRouter()


def get_optimization_service() -> OptimizationService:
    provider = VnStockDataProvider(source=settings.vnstock_source)
    return OptimizationService(
        provider=provider,
        periods_per_year=settings.trading_days_per_year,
    )


@router.post("/optimize", response_model=OptimizeResponse)
def optimize_portfolio(
    payload: OptimizeRequest,
    service: OptimizationService = Depends(get_optimization_service),
) -> OptimizeResponse:
    try:
        return service.optimize(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc
    

@router.get("/debug/price/{symbol}")
def debug_price(
    symbol: str,
    start: str = "2024-01-01",
    end: str = "2025-01-01",
):
    provider = VnStockDataProvider(source=settings.vnstock_source)
    df = provider.get_price_history(
        symbol=symbol.upper(),
        start_date=start,
        end_date=end,
        interval="1D",
    )
    return {
        "source": settings.vnstock_source,
        "symbol": symbol.upper(),
        "rows": len(df),
        "columns": list(df.columns),
        "sample": df.head(3).to_dict(orient="records"),
    }
