from typing import List
from fastapi import APIRouter, Depends, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import datetime

from sqlalchemy import text
from app.core.deps import get_db, get_current_active_user

from app.models.user import User
from app.schemas.system import Report, ReportCreate
from app.services import system_service
from app.services.portfolio_service import get_portfolios_by_user

router = APIRouter()

@router.get("/reports", response_model=List[Report])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return system_service.get_reports(db, current_user.id)

import os
import csv
from datetime import datetime
from fastapi.responses import FileResponse

def generate_report_task(db: Session, user_id: int, format: str):
    portfolios = get_portfolios_by_user(db, user_id)
    
    # Normally we'd use a robust storage, but for MVP we use local 'data' folder
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    file_name = f"Report_Portfolios_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    file_path = os.path.join(data_dir, file_name)
    
    if format.lower() == 'csv' or format.lower() == 'xlsx':
        # Default to CSV export of transactions for MVP
        with open(file_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Portfolio", "Ticker", "Type", "Quantity", "Price", "Date"])
            for p in portfolios:
                from app.services.portfolio_service import get_transactions
                txs = get_transactions(db, p.id, user_id)
                for tx in txs:
                    trade_dt = tx.trade_date.strftime("%Y-%m-%d %H:%M:%S") if tx.trade_date else ""
                    writer.writerow([p.name, tx.ticker, tx.transaction_type.name, str(tx.quantity), str(tx.price), trade_dt])
    else:
        # Fallback empty standard
        with open(file_path, mode='w') as f:
            f.write("PDF mock placeholder generated.")

    system_service.create_report(db, user_id, ReportCreate(
        report_type="transactions",
        format=format.lower(),
        storage_path=file_name
    ))


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    reports = system_service.get_reports(db, current_user.id)
    report = next((r for r in reports if r.id == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    full_path = os.path.join(data_dir, report.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")
        
    return FileResponse(path=full_path, filename=report.file_path)

@router.post("/reports/generate")
def trigger_report_generation(
    format: str,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    system_service.add_audit_log(
        db, 
        action="REPORT_GENERATED", 
        entity_type="report", 
        details={"format": format}, 
        user_id=current_user.id
    )

    background_tasks.add_task(generate_report_task, db, current_user.id, format)
    return {"message": "Report generation started."}

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Very basic health check (verifying db works)
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected", "engine": db.bind.name}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "error": str(e)}

from app.schemas.system import AuditLog as AuditLogSchema

@router.get("/audit-logs", response_model=List[AuditLogSchema])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Fetch recent system audit logs. Available to logged-in users.
    """
    return system_service.get_audit_logs(db, limit=50)

