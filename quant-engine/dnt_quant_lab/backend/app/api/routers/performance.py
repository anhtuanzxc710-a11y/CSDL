from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.services import performance_service

router = APIRouter()

@router.get("/{portfolio_id}/performance")
def read_performance(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stats = performance_service.get_performance_summary(db, portfolio_id, current_user.id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return stats
