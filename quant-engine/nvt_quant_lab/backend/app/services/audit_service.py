import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.services import system_service
from app.core.logging_config import _audit_logger, mask_sensitive_data
from datetime import datetime, timezone

def log_audit(
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    db: Optional[Session] = None
):
    """
    Log security and lifecycle actions to:
    1. Database AuditLogs table (if db is provided)
    2. logs/audit.log file in JSON format
    """
    # 1. Mask sensitive details
    details_masked = mask_sensitive_data(details) if details else {}
    import decimal
    def convert_decimals(obj):
        if isinstance(obj, dict):
            return {k: convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(v) for v in obj]
        elif isinstance(obj, decimal.Decimal):
            return float(obj)
        return obj
    details_masked = convert_decimals(details_masked)

    # 2. Log to Database
    if db:
        try:
            system_service.add_audit_log(
                db=db,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details_masked,
                user_id=user_id
            )
        except Exception as e:
            # Fail gracefully, do not block request handling
            print(f"[ERROR] Failed to write audit log to database: {e}")

    # 3. Log to logs/audit.log
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "INFO",
        "event": "audit_event",
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details_masked
    }
    if user_id:
        log_entry["user_id"] = user_id

    _audit_logger.info(json.dumps(log_entry, ensure_ascii=False))
