"""
Module D – Standardized Error Management
Phase 2: Quant Platform Productionization

Provides unified error schema for all quant API responses,
ensuring consistent error structures across the platform.

NOTE: This is a NEW module. No existing code was modified.
"""

from enum import Enum
from typing import Optional, Any


class QuantErrorCode(str, Enum):
    """Enumeration of all standardized error codes."""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DATA_FETCH_ERROR = "DATA_FETCH_ERROR"
    CACHE_ERROR = "CACHE_ERROR"
    BENCHMARK_ERROR = "BENCHMARK_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# ── Human-readable messages (Vietnamese) ─────────────────────────────────────
_ERROR_MESSAGES = {
    QuantErrorCode.VALIDATION_ERROR: "Dữ liệu đầu vào không hợp lệ.",
    QuantErrorCode.DATA_FETCH_ERROR: "Không thể tải dữ liệu thị trường. Vui lòng thử lại.",
    QuantErrorCode.CACHE_ERROR: "Lỗi hệ thống cache. Đang sử dụng dữ liệu trực tiếp.",
    QuantErrorCode.BENCHMARK_ERROR: "Không thể tải dữ liệu benchmark. Phân tích tiếp tục ở chế độ giảm cấp.",
    QuantErrorCode.NETWORK_ERROR: "Lỗi kết nối mạng. Máy chủ dữ liệu không phản hồi.",
    QuantErrorCode.INTERNAL_ERROR: "Lỗi hệ thống nội bộ. Vui lòng thử lại sau.",
}


def build_error_response(
    error_code: QuantErrorCode,
    message: str = None,
    details: Optional[Any] = None
) -> dict:
    """
    Build a standardized error response dict.

    Returns:
        {
            "success": false,
            "error_code": "DATA_FETCH_ERROR",
            "message": "...",
            "details": {...}
        }
    """
    return {
        "success": False,
        "error_code": error_code.value,
        "message": message or _ERROR_MESSAGES.get(error_code, "Lỗi không xác định."),
        "details": details,
    }


def build_success_response(data: dict, meta: dict = None) -> dict:
    """
    Wrap a successful response with success flag and optional metadata.

    The original data dict is returned as-is with added fields,
    preserving backward compatibility with Phase 1 response schema.

    Returns:
        {
            ...original data fields...,
            "success": true,
            "_meta": {...}
        }
    """
    response = dict(data)  # Preserve all original fields
    response["success"] = True
    if meta:
        response["_meta"] = meta
    return response
