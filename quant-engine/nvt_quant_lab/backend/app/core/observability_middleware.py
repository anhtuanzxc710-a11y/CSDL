import time
import uuid
import contextvars
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt

from app.core.config import settings
from app.core.logging_config import (
    request_id_ctx,
    user_id_ctx,
    _structured_log,
)

class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Handle/Propagate Request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
            
        request_id_ctx.set(request_id)
        request.state.request_id = request_id

        # 2. Extract User ID from JWT if present to tag logs
        auth_header = request.headers.get("Authorization")
        user_id = None
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = jwt.decode(
                    token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
                )
                user_id = payload.get("sub")
                if user_id:
                    user_id_ctx.set(int(user_id))
            except Exception:
                pass  # Ignore invalid tokens, dependency injection will raise 401 later

        # 3. Track performance and process request
        start_time = time.perf_counter()
        
        # We need a fallback check in case of exceptions
        status_code = 500
        error_type = None
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            error_type = type(e).__name__
            _structured_log(
                "CRITICAL",
                "request_failed",
                request_id=request_id,
                user_id=user_id,
                endpoint=request.url.path,
                method=request.method,
                error_type=error_type,
                message=str(e),
            )
            raise e
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            # Log slow requests
            if duration_ms > 5000:
                _structured_log(
                    "CRITICAL",
                    "slow_request_detected",
                    request_id=request_id,
                    user_id=user_id,
                    endpoint=request.url.path,
                    method=request.method,
                    duration_ms=round(duration_ms, 2),
                    status_code=status_code,
                    message=f"Request took {duration_ms:.2f}ms which is critical (>5000ms)",
                )
            elif duration_ms > 1000:
                _structured_log(
                    "WARNING",
                    "slow_request_detected",
                    request_id=request_id,
                    user_id=user_id,
                    endpoint=request.url.path,
                    method=request.method,
                    duration_ms=round(duration_ms, 2),
                    status_code=status_code,
                    message=f"Request took {duration_ms:.2f}ms which is slow (>1000ms)",
                )
                
            # Log all completed requests in JSON format
            _structured_log(
                "INFO",
                "request_completed",
                request_id=request_id,
                user_id=user_id,
                endpoint=request.url.path,
                method=request.method,
                duration_ms=round(duration_ms, 2),
                status_code=status_code,
                error_type=error_type,
                message=f"HTTP {request.method} {request.url.path} completed with status {status_code}",
            )
            
            # Clear context variables
            request_id_ctx.set(None)
            user_id_ctx.set(None)
