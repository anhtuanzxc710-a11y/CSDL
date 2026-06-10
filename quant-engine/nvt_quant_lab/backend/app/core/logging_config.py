"""
Module E – Observability & Structured Logging
Phase 2: Quant Platform Productionization
Enhanced for Phase E with rotating log files, JSON formatting, sensitive field masking, and context tracking.
"""

import logging
from logging.handlers import RotatingFileHandler
import json
import uuid
import time
import os
import contextvars
from datetime import datetime, timezone
from typing import Any

# Tracing context variables
request_id_ctx = contextvars.ContextVar("request_id", default=None)
user_id_ctx = contextvars.ContextVar("user_id", default=None)

# Paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGS_DIR = os.path.join(BACKEND_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Logger setups
_quant_logger = logging.getLogger("quant_platform")
_quant_logger.setLevel(logging.DEBUG)
_quant_logger.propagate = False # prevent duplicate logs in uvicorn root logger

_audit_logger = logging.getLogger("audit_platform")
_audit_logger.setLevel(logging.INFO)
_audit_logger.propagate = False

# Sensitive masking keys
SENSITIVE_KEYS = {"password", "token", "refresh_token", "access_token", "api_key", "secret", "hashed_password", "jwt"}

def mask_sensitive_data(val: Any) -> Any:
    if isinstance(val, dict):
        return {k: "[MASKED]" if k.lower() in SENSITIVE_KEYS else mask_sensitive_data(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [mask_sensitive_data(v) for v in val]
    elif isinstance(val, str):
        if val.lower().startswith("bearer "):
            return "Bearer [MASKED]"
        return val
    return val

class JSONFormatter(logging.Formatter):
    def format(self, record):
        # Check if record message is already a JSON string (emitted by _structured_log)
        try:
            log_data = json.loads(record.getMessage())
            if not isinstance(log_data, dict):
                raise ValueError()
        except Exception:
            # If standard message, wrap it in JSON format
            log_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "module": record.name,
                "message": record.getMessage()
            }
        
        # Inject dynamic context if not present
        if "request_id" not in log_data:
            req_id = request_id_ctx.get()
            if req_id:
                log_data["request_id"] = req_id
                
        if "user_id" not in log_data:
            u_id = user_id_ctx.get()
            if u_id:
                log_data["user_id"] = u_id

        # Mask sensitive data
        log_data = mask_sensitive_data(log_data)
        
        return json.dumps(log_data, ensure_ascii=False)

# Formatters
json_formatter = JSONFormatter()
console_formatter = logging.Formatter(
    "[%(asctime)s] %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Setup handlers
if not _quant_logger.handlers:
    # Console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(console_formatter)
    _quant_logger.addHandler(console_handler)
    
    # App Rotating File (All INFO and above)
    app_file_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, "app.log"),
        maxBytes=10*1024*1024, # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    app_file_handler.setLevel(logging.INFO)
    app_file_handler.setFormatter(json_formatter)
    _quant_logger.addHandler(app_file_handler)
    
    # Error Rotating File (All WARNING and above)
    error_file_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, "error.log"),
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding="utf-8"
    )
    error_file_handler.setLevel(logging.WARNING)
    error_file_handler.setFormatter(json_formatter)
    _quant_logger.addHandler(error_file_handler)

# Handlers for Audit Logger
if not _audit_logger.handlers:
    audit_file_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, "audit.log"),
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding="utf-8"
    )
    audit_file_handler.setLevel(logging.INFO)
    audit_file_handler.setFormatter(json_formatter)
    _audit_logger.addHandler(audit_file_handler)
    
    # Also log audit to console in development
    audit_console = logging.StreamHandler()
    audit_console.setLevel(logging.INFO)
    audit_console.setFormatter(console_formatter)
    _audit_logger.addHandler(audit_console)


def generate_request_id() -> str:
    """Generate a unique request ID for tracing."""
    return str(uuid.uuid4())[:12]


def _structured_log(level: str, event: str, request_id: str = None, **kwargs):
    """Emit a structured JSON log entry."""
    req_id = request_id or request_id_ctx.get()
    u_id = kwargs.pop("user_id", None) or user_id_ctx.get()

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "event": event,
    }
    if req_id:
        entry["request_id"] = req_id
    if u_id:
        entry["user_id"] = u_id

    entry.update(kwargs)
    entry = mask_sensitive_data(entry)

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
