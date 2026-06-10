from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class ReportBase(BaseModel):
    report_type: str # 'portfolio', 'risk', 'transactions', 'summary'
    format: str # 'pdf', 'csv', 'json'
    storage_path: str
    status: str = "completed"
    portfolio_id: Optional[int] = None

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuditLogBase(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    detail_json: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None

class AuditLog(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

