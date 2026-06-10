"""
Module E – Health Check System
Phase 2 & Phase E: Quant Platform Productionization
Provides extended health check endpoints.
"""

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.deps import get_db
from app.core.config import settings
from datetime import datetime, timezone
import os

from app.core.resilience import get_cache_health, get_market_data_health, get_benchmark_health
from app.services.alert_service import send_alert

router = APIRouter()

def check_dir_writable(path: str) -> bool:
    if not os.path.exists(path):
        try:
            os.makedirs(path, exist_ok=True)
        except Exception:
            return False
    temp_file = os.path.join(path, ".health_check_temp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            f.write("health_check")
        os.remove(temp_file)
        return True
    except Exception:
        return False

@router.get("/health", tags=["health"])
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}

@router.get("/health/liveness", tags=["health"])
def liveness_check():
    """Liveness check (is the process alive)."""
    return {"status": "ok"}

@router.get("/health/readiness", tags=["health"])
def readiness_check(db: Session = Depends(get_db)):
    """Readiness check (is the app ready to serve traffic). Checks critical path: DB."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        send_alert("READINESS_FAILED", f"Database is not ready: {str(e)}", "CRITICAL")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connectivity failed"
        )

@router.get("/health/dependencies", tags=["health"])
def dependencies_health(db: Session = Depends(get_db)):
    """Detailed dependencies health check."""
    checks = {}
    warnings = []
    has_errors = False
    has_warnings = False

    # 1. Database Check
    try:
        start_time = datetime.now()
        db.execute(text("SELECT 1"))
        duration = (datetime.now() - start_time).total_seconds() * 1000
        checks["database"] = {
            "status": "ok",
            "latency_ms": round(duration, 2)
        }
    except Exception as e:
        has_errors = True
        checks["database"] = {
            "status": "error",
            "message": str(e)
        }

    # 2. Market Data Check
    market_health = get_market_data_health()
    checks["market_data"] = market_health
    if market_health.get("status") != "ok":
        has_warnings = True
        warnings.append("Market data status is degraded or error.")

    # 3. AI Provider Check
    ai_key = settings.GEMINI_API_KEY
    if not ai_key or ai_key == "your_gemini_api_key_here":
        has_warnings = True
        warnings.append("Gemini API key is not configured.")
        checks["ai_provider"] = {
            "status": "degraded",
            "message": "GEMINI_API_KEY env var is missing or empty"
        }
    else:
        checks["ai_provider"] = {
            "status": "ok",
            "provider": "google-gemini",
            "configured": True
        }

    # 4. Cache Check
    checks["cache"] = get_cache_health()

    # 5. Storage Check (Logs & Exports)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(backend_dir, "data")
    logs_dir = os.path.join(backend_dir, "logs")

    data_writable = check_dir_writable(data_dir)
    logs_writable = check_dir_writable(logs_dir)

    checks["storage"] = {
        "status": "ok" if (data_writable and logs_writable) else "error",
        "export_path": {
            "path": data_dir,
            "writable": data_writable
        },
        "logs_path": {
            "path": logs_dir,
            "writable": logs_writable
        }
    }

    if not data_writable or not logs_writable:
        has_errors = True
        warnings.append("Logs or Data directories are not writable.")

    # Overall Status
    status_str = "ok"
    if has_errors:
        status_str = "error"
        send_alert("HEALTH_DEGRADED", f"Critical check failed. Warnings: {warnings}", "CRITICAL")
    elif has_warnings:
        status_str = "degraded"
        send_alert("HEALTH_WARNING", f"Degraded dependencies. Warnings: {warnings}", "WARNING")

    return {
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "warnings": warnings
    }


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
