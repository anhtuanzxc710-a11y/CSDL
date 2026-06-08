from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.portfolio import OptimizeRequest, OptimizeResponse
from app.services.portfolio_service import PortfolioService
from app.services.vnstock_provider import VnStockDataProvider

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def get_portfolio_service(settings: Settings = Depends(get_settings)) -> PortfolioService:
    provider = VnStockDataProvider(source=settings.vnstock_source)
    return PortfolioService(
        provider=provider,
        periods_per_year=settings.trading_days_per_year,
    )


@router.post("/optimize", response_model=OptimizeResponse)
def optimize_portfolio(
    payload: OptimizeRequest,
    service: PortfolioService = Depends(get_portfolio_service),
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
    settings: Settings = Depends(get_settings),
):
    provider = VnStockDataProvider(source=settings.vnstock_source)
    # Dùng provider đã fix, không gọi Vnstock().stock() nữa
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