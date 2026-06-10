from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.stocks import Stock
from fastapi import HTTPException
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate, HoldingsResponse, HoldingItem
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.services.system_service import add_audit_log
from app.services.performance_service import capture_portfolio_snapshot

from core.data_engine import fetch_current_prices


def create_portfolio(db: Session, obj_in: PortfolioCreate, user_id: int) -> Portfolio:
    # If this is the user's first portfolio, make it default
    is_default = db.query(Portfolio).filter(Portfolio.user_id == user_id).count() == 0
    
    # Extract data from Pydantic model
    data = obj_in.dict()
    
    db_obj = Portfolio(
        **data,
        user_id=user_id,
        is_default=is_default
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    add_audit_log(db, action="PORTFOLIO_CREATED", entity_type="portfolio", entity_id=str(db_obj.id), user_id=user_id)
    return db_obj


def get_portfolios_by_user(db: Session, user_id: int) -> List[Portfolio]:
    return db.query(Portfolio).filter(Portfolio.user_id == user_id).all()

def get_portfolio(db: Session, portfolio_id: int, user_id: int) -> Optional[Portfolio]:
    return db.query(Portfolio).filter(
        Portfolio.id == portfolio_id, Portfolio.user_id == user_id
    ).first()

def update_portfolio(db: Session, portfolio_id: int, user_id: int, obj_in: PortfolioUpdate) -> Optional[Portfolio]:
    db_obj = get_portfolio(db, portfolio_id, user_id)
    if not db_obj:
        return None
    for field, value in obj_in.dict(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def set_default_portfolio(db: Session, portfolio_id: int, user_id: int):
    db.query(Portfolio).filter(Portfolio.user_id == user_id).update({"is_default": False})
    db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user_id).update({"is_default": True})
    db.commit()

def delete_portfolio(db: Session, portfolio_id: int, user_id: int) -> bool:
    db_obj = get_portfolio(db, portfolio_id, user_id)
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True

# --- TRANSACTIONS ---

def add_transaction(db: Session, portfolio_id: int, user_id: int, obj_in: TransactionCreate) -> Optional[Transaction]:
    # verify portfolio ownership
    if not get_portfolio(db, portfolio_id, user_id):
        return None
    
    ticker_str = obj_in.ticker.upper()
    stock = db.query(Stock).filter(Stock.ticker == ticker_str).first()
    if not stock:
        try:
            new_stock = Stock(ticker=ticker_str, company_name=ticker_str)
            db.add(new_stock)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to auto-register ticker {ticker_str}: {str(e)}")

    # Explicitly map fields to DB columns
    db_obj = Transaction(
        portfolio_id=portfolio_id,
        ticker=ticker_str,
        side=obj_in.side,
        quantity=obj_in.quantity,
        price=obj_in.price,
        fee=obj_in.fee,
        tax=obj_in.tax,
        trade_date=obj_in.trade_date.date() if obj_in.trade_date else datetime.utcnow().date(),
        note=obj_in.note
    )
    db.add(db_obj)
    try:
        db.commit()
        db.refresh(db_obj)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during transaction commit: {str(e)}")
    
    # Audit and Snapshot trigger
    add_audit_log(db, action="TRANSACTION_ADDED", entity_type="transaction", entity_id=str(db_obj.id), user_id=user_id)
    capture_portfolio_snapshot(db, portfolio_id, user_id)
    
    return db_obj


def get_transactions(db: Session, portfolio_id: int, user_id: int) -> List[Transaction]:
    if not get_portfolio(db, portfolio_id, user_id):
        return []
    return db.query(Transaction).filter(
        Transaction.portfolio_id == portfolio_id
    ).order_by(Transaction.trade_date.desc()).all()

def delete_transaction(db: Session, transaction_id: int, portfolio_id: int, user_id: int) -> bool:
    if not get_portfolio(db, portfolio_id, user_id):
        return False
    # Also verify transaction belongs to portfolio
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.portfolio_id == portfolio_id).first()
    if tx:
        db.delete(tx)
        db.commit()
        # Audit and Snapshot trigger
        add_audit_log(db, action="TRANSACTION_DELETED", entity_type="transaction", entity_id=str(transaction_id), user_id=user_id)
        capture_portfolio_snapshot(db, portfolio_id, user_id)
        return True
    return False


def update_transaction(db: Session, transaction_id: int, portfolio_id: int, user_id: int, obj_in: TransactionUpdate) -> Optional[Transaction]:
    if not get_portfolio(db, portfolio_id, user_id):
        return None
    # Verify transaction belongs to portfolio
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.portfolio_id == portfolio_id).first()
    if not tx:
        return None
    
    update_data = obj_in.dict(exclude_unset=True)
    
    if "ticker" in update_data and update_data["ticker"]:
        ticker_str = update_data["ticker"].upper()
        stock = db.query(Stock).filter(Stock.ticker == ticker_str).first()
        if not stock:
            try:
                new_stock = Stock(ticker=ticker_str, company_name=ticker_str)
                db.add(new_stock)
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to auto-register ticker {ticker_str}: {str(e)}")
        tx.ticker = ticker_str
        
    if "side" in update_data:
        tx.side = update_data["side"]
    if "quantity" in update_data:
        tx.quantity = update_data["quantity"]
    if "price" in update_data:
        tx.price = update_data["price"]
    if "fee" in update_data:
        tx.fee = update_data["fee"]
    if "tax" in update_data:
        tx.tax = update_data["tax"]
    if "trade_date" in update_data:
        tx.trade_date = update_data["trade_date"].date() if update_data["trade_date"] else datetime.utcnow().date()
    if "note" in update_data:
        tx.note = update_data["note"]
        
    try:
        db.commit()
        db.refresh(tx)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during transaction update: {str(e)}")
        
    # Audit and Snapshot trigger
    add_audit_log(db, action="TRANSACTION_UPDATED", entity_type="transaction", entity_id=str(transaction_id), user_id=user_id)
    capture_portfolio_snapshot(db, portfolio_id, user_id)
    
    return tx


def update_ticker_holding(db: Session, portfolio_id: int, user_id: int, ticker: str, quantity: float, avg_cost: float) -> bool:
    # verify portfolio ownership
    if not get_portfolio(db, portfolio_id, user_id):
        return False
    
    ticker_str = ticker.upper()
    
    # Delete all existing transactions for this ticker in this portfolio
    db.query(Transaction).filter(
        Transaction.portfolio_id == portfolio_id,
        Transaction.ticker == ticker_str
    ).delete(synchronize_session=False)
    
    # If quantity > 0, create a new BUY transaction
    if quantity > 0:
        stock = db.query(Stock).filter(Stock.ticker == ticker_str).first()
        if not stock:
            try:
                new_stock = Stock(ticker=ticker_str, company_name=ticker_str)
                db.add(new_stock)
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to auto-register ticker {ticker_str}: {str(e)}")
        
        db_obj = Transaction(
            portfolio_id=portfolio_id,
            ticker=ticker_str,
            side="BUY",
            quantity=quantity,
            price=avg_cost,
            fee=0.0,
            tax=0.0,
            trade_date=datetime.utcnow().date(),
            note="Cập nhật trực tiếp số dư holdings"
        )
        db.add(db_obj)
        
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during holding update: {str(e)}")
        
    add_audit_log(db, action="HOLDING_UPDATED", entity_type="portfolio", entity_id=str(portfolio_id), user_id=user_id)
    capture_portfolio_snapshot(db, portfolio_id, user_id)
    
    return True


# --- HOLDINGS COMPUTATION ---

def get_portfolio_holdings(db: Session, portfolio_id: int, user_id: int) -> Optional[HoldingsResponse]:
    if not get_portfolio(db, portfolio_id, user_id):
        return None
        
    transactions = db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id).order_by(Transaction.trade_date).all()
    
    # Calculate holdings Map
    # Basic logic: avg cost = total cost / total qty.
    holdings_dict = {}
    
    for tx in transactions:
        t = tx.ticker.upper()
        if t not in holdings_dict:
            holdings_dict[t] = {"qty": 0.0, "total_cost": 0.0}
        
        q = float(tx.quantity)
        p = float(tx.price)
        
        if tx.side.upper() == "BUY":
            holdings_dict[t]["qty"] += q
            holdings_dict[t]["total_cost"] += (q * p)
        else: # SELL

            # We reduce quantity, and reduce total cost proportionally (average cost basis)
            if holdings_dict[t]["qty"] > 0:
                avg_cost_before_sell = holdings_dict[t]["total_cost"] / holdings_dict[t]["qty"]
                holdings_dict[t]["qty"] -= q
                # if qty goes below 0, it's a short sale (simplification: assume 0)
                if holdings_dict[t]["qty"] <= 0:
                    holdings_dict[t]["qty"] = 0
                    holdings_dict[t]["total_cost"] = 0
                else:
                    holdings_dict[t]["total_cost"] = holdings_dict[t]["qty"] * avg_cost_before_sell

    # filter out 0 qty
    active_holdings = {k: v for k, v in holdings_dict.items() if v["qty"] > 0}
    
    map_res = {k: v["qty"] for k, v in active_holdings.items()}
    
    # Fetch real-time prices
    tickers = list(active_holdings.keys())
    current_prices = fetch_current_prices(tickers) if tickers else {}

    items_res = []
    total_market_val = 0.0
    
    for k, v in active_holdings.items():
        qty = v["qty"]
        avg = v["total_cost"] / qty
        market_p = current_prices.get(k, avg) # fallback to avg if missing
        val = qty * market_p
        total_market_val += val
        
        items_res.append(HoldingItem(
            ticker=k,
            quantity=qty,
            avg_cost=avg,
            market_price=market_p,
            market_value=val,
            unrealized_pnl=val - v["total_cost"],
            weight=0
        ))
        
    for item in items_res:
        if total_market_val > 0:
            item.weight = item.market_value / total_market_val
            
    return HoldingsResponse(map=map_res, items=items_res)
