from fastapi import FastAPI

from app.api.v1.endpoints.portfolio import router as portfolio_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Black-Litterman portfolio optimizer for Vietnam stocks using vnstock",
)

app.include_router(portfolio_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}