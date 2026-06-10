"""
Module F – Health Check System
Phase 2: Quant Platform Productionization

Provides operational monitoring endpoints:
- GET /health       → Basic health check
- GET /health/quant → Detailed quant subsystem health

NOTE: This is a NEW router. No existing code was modified.
"""

from fastapi import APIRouter

from app.core.resilience import get_cache_health, get_market_data_health, get_benchmark_health

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}


@router.get("/health/quant", tags=["health"])
def quant_health_check():
    """
    Detailed health check for quant subsystem.
    Returns status of cache, market data provider, and benchmark.
    """
    return {
        "status": "ok",
        "cache": get_cache_health(),
        "market_data": get_market_data_health(),
        "benchmark": get_benchmark_health(),
    }
