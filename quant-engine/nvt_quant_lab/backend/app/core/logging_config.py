"""
Module E – Observability & Structured Logging
Phase 2: Quant Platform Productionization

Provides structured logging with request IDs, timestamps, severity levels,
and event-specific log methods for production monitoring.

NOTE: This is a NEW module. No existing code was modified.
"""

import logging
import json
import uuid
import time
from datetime import datetime, timezone
from functools import wraps


# ── Logger Setup ─────────────────────────────────────────────────────────────
_quant_logger = logging.getLogger("quant_platform")
_quant_logger.setLevel(logging.DEBUG)

# Console handler with structured format
if not _quant_logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setLevel(logging.DEBUG)
    _formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    _handler.setFormatter(_formatter)
    _quant_logger.addHandler(_handler)


def generate_request_id() -> str:
    """Generate a unique request ID for tracing."""
    return str(uuid.uuid4())[:12]


def _structured_log(level: str, event: str, request_id: str = None, **kwargs):
    """Emit a structured JSON log entry."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "event": event,
    }
    if request_id:
        entry["request_id"] = request_id
    entry.update(kwargs)

    log_line = json.dumps(entry, ensure_ascii=False, default=str)

    level_map = {
        "DEBUG": _quant_logger.debug,
        "INFO": _quant_logger.info,
        "WARNING": _quant_logger.warning,
        "ERROR": _quant_logger.error,
        "CRITICAL": _quant_logger.critical,
    }
    log_fn = level_map.get(level.upper(), _quant_logger.info)
    log_fn(log_line)


# ── Public Event Loggers ─────────────────────────────────────────────────────

def log_analysis_started(request_id: str, tickers: list, start_date: str, end_date: str):
    _structured_log("INFO", "analysis_started", request_id=request_id,
                     tickers=tickers, start_date=start_date, end_date=end_date)


def log_analysis_completed(request_id: str, duration_ms: float, ticker_count: int,
                            is_degraded: bool = False, benchmark_source: str = "VN30"):
    _structured_log("INFO", "analysis_completed", request_id=request_id,
                     duration_ms=round(duration_ms, 2), ticker_count=ticker_count,
                     is_degraded=is_degraded, benchmark_source=benchmark_source)


def log_cache_hit(request_id: str, symbol: str):
    _structured_log("DEBUG", "cache_hit", request_id=request_id, symbol=symbol)


def log_cache_miss(request_id: str, symbol: str):
    _structured_log("DEBUG", "cache_miss", request_id=request_id, symbol=symbol)


def log_retry_triggered(request_id: str, attempt: int, max_retries: int,
                         url: str = None, error: str = None):
    _structured_log("WARNING", "retry_triggered", request_id=request_id,
                     attempt=attempt, max_retries=max_retries, url=url, error=error)


def log_benchmark_fallback(request_id: str, failed_source: str, fallback_source: str):
    _structured_log("WARNING", "benchmark_fallback", request_id=request_id,
                     failed_source=failed_source, fallback_source=fallback_source)


def log_exception(request_id: str, error_code: str, message: str, details: dict = None):
    _structured_log("ERROR", "exception_raised", request_id=request_id,
                     error_code=error_code, message=message, details=details)


# ── Timer Utility ────────────────────────────────────────────────────────────

class Timer:
    """Simple context manager for measuring execution time in milliseconds."""

    def __init__(self):
        self.start_time = None
        self.elapsed_ms = 0.0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed_ms = (time.perf_counter() - self.start_time) * 1000
