from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate, Portfolio as PortfolioSchema, HoldingsResponse
from app.schemas.transaction import Transaction, TransactionCreate, TransactionUpdate
from app.services import portfolio_service

router = APIRouter()

@router.get("", response_model=List[PortfolioSchema])
def read_portfolios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return portfolio_service.get_portfolios_by_user(db, current_user.id)

@router.post("", response_model=PortfolioSchema)
def create_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_in: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
):
    res = portfolio_service.create_portfolio(db, portfolio_in, current_user.id)
    from app.services.audit_service import log_audit
    log_audit(
        action="PORTFOLIO_CREATED",
        entity_type="portfolio",
        entity_id=str(res.id),
        details={"name": res.name},
        user_id=current_user.id,
        db=db
    )
    return res

@router.get("/{portfolio_id}", response_model=PortfolioSchema)
def read_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    portfolio = portfolio_service.get_portfolio(db, portfolio_id, current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.post("/{portfolio_id}/set-default")
def set_default_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    portfolio = portfolio_service.get_portfolio(db, portfolio_id, current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio_service.set_default_portfolio(db, portfolio_id, current_user.id)
    from app.services.audit_service import log_audit
    log_audit(
        action="PORTFOLIO_DEFAULT_CHANGED",
        entity_type="portfolio",
        entity_id=str(portfolio_id),
        user_id=current_user.id,
        db=db
    )
    return {"success": True}

@router.get("/{portfolio_id}/holdings", response_model=HoldingsResponse)
def get_holdings(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    res = portfolio_service.get_portfolio_holdings(db, portfolio_id, current_user.id)
    if res is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return res

# -- Transaction nested routes --
@router.get("/{portfolio_id}/transactions", response_model=List[Transaction])
def read_transactions(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return portfolio_service.get_transactions(db, portfolio_id, current_user.id)

@router.post("/{portfolio_id}/transactions", response_model=Transaction)
def add_transaction(
    portfolio_id: int,
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tx = portfolio_service.add_transaction(db, portfolio_id, current_user.id, tx_in)
    if not tx:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    from app.services.audit_service import log_audit
    log_audit(
        action="TRANSACTION_ADDED",
        entity_type="transaction",
        entity_id=str(tx.id),
        details={"ticker": tx.ticker, "quantity": tx.quantity, "price": tx.price, "type": tx.transaction_type.name if hasattr(tx.transaction_type, "name") else str(tx.transaction_type)},
        user_id=current_user.id,
        db=db
    )
    return tx

@router.delete("/{portfolio_id}/transactions/{transaction_id}")
def delete_transaction(
    portfolio_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    success = portfolio_service.delete_transaction(db, transaction_id, portfolio_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    from app.services.audit_service import log_audit
    log_audit(
        action="TRANSACTION_DELETED",
        entity_type="transaction",
        entity_id=str(transaction_id),
        details={"portfolio_id": portfolio_id},
        user_id=current_user.id,
        db=db
    )
    return {"success": True}

@router.put("/{portfolio_id}/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
    portfolio_id: int,
    transaction_id: int,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tx = portfolio_service.update_transaction(db, transaction_id, portfolio_id, current_user.id, tx_in)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    from app.services.audit_service import log_audit
    log_audit(
        action="TRANSACTION_UPDATED",
        entity_type="transaction",
        entity_id=str(tx.id),
        details={"ticker": tx.ticker, "quantity": tx.quantity, "price": tx.price, "type": tx.transaction_type.name if hasattr(tx.transaction_type, "name") else str(tx.transaction_type)},
        user_id=current_user.id,
        db=db
    )
    return tx
