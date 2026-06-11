import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.system import Report, AuditLog
from app.schemas.system import ReportCreate, AuditLogCreate

def create_report(db: Session, user_id: int, obj_in: ReportCreate) -> Report:
    report = Report(**obj_in.dict(), user_id=user_id)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_reports(db: Session, user_id: int) -> List[Report]:
    return db.query(Report).filter(Report.user_id == user_id).order_by(Report.created_at.desc()).all()

def add_audit_log(db: Session, action: str, entity_type: str, entity_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None, user_id: Optional[int] = None) -> AuditLog:
    import decimal
    def convert_decimals(obj):
        if isinstance(obj, dict):
            return {k: convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(v) for v in obj]
        elif isinstance(obj, decimal.Decimal):
            return float(obj)
        return obj
    cleaned_details = convert_decimals(details) if details else None
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail_json=json.dumps(cleaned_details) if cleaned_details else None,
        user_id=user_id
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_audit_logs(db: Session, limit: int = 50) -> List[AuditLog]:
    # typically only format admin dashboard, but we return all for simplicity
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
