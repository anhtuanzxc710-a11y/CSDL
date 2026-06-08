import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.transaction import Transaction
from app.models.portfolio import Portfolio
from core.data_engine import fetch_current_prices, fetch_stock_data

def capture_portfolio_snapshot(db: Session, portfolio_id: int, user_id: int, snapshot_date: Optional[datetime.date] = None) -> PortfolioSnapshot:
    """
    Captures the current state of a portfolio into a snapshot.
    If a snapshot for the same date exists, it is updated.
    """
    from app.services.portfolio_service import get_portfolio_holdings
    
    if not snapshot_date:
        snapshot_date = datetime.date.today()
    
    holdings_res = get_portfolio_holdings(db, portfolio_id, user_id)
    if not holdings_res:
        return None
    
    total_market_val = sum(item.market_value for item in holdings_res.items)
    unrealized_pnl = sum(item.unrealized_pnl for item in holdings_res.items)
    invested_value = sum(item.quantity * item.avg_cost for item in holdings_res.items)
    
    # Check if snapshot for this date already exists
    snapshot = db.query(PortfolioSnapshot).filter(
        PortfolioSnapshot.portfolio_id == portfolio_id,
        PortfolioSnapshot.snapshot_date == snapshot_date
    ).first()
    
    if snapshot:
        snapshot.market_value = total_market_val
        snapshot.unrealized_pnl = unrealized_pnl
        snapshot.invested_value = invested_value
        snapshot.total_value = total_market_val # Simplified
    else:
        # Get previous snapshot for DailyReturnPct calculation
        prev_snapshot = db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == portfolio_id,
            PortfolioSnapshot.snapshot_date < snapshot_date
        ).order_by(PortfolioSnapshot.snapshot_date.desc()).first()
        
        daily_return = 0.0
        if prev_snapshot and float(prev_snapshot.market_value) > 0:
            daily_return = (float(total_market_val) / float(prev_snapshot.market_value)) - 1
            
        snapshot = PortfolioSnapshot(
            portfolio_id=portfolio_id,
            snapshot_date=snapshot_date,
            cash_value=0,
            invested_value=invested_value,
            market_value=total_market_val,
            total_value=total_market_val,
            realized_pnl=0,
            unrealized_pnl=unrealized_pnl,
            daily_return_pct=daily_return
        )
        db.add(snapshot)
    
    db.commit()
    db.refresh(snapshot)
    return snapshot

def rebuild_snapshots_from_history(db: Session, portfolio_id: int, user_id: int):
    """
    Rebuilds historical snapshots by iterating day-by-day (last 30 days) 
    based on transactions and historical prices.
    """
    # This is an expensive operation, typically done only once or on demand
    # For now, we'll just capture the current state as a 'rebuild'
    capture_portfolio_snapshot(db, portfolio_id, user_id)

def get_performance_summary(db: Session, portfolio_id: int, user_id: int) -> dict:
    """
    Returns performance summary driven by real snapshots.
    If no snapshots exist, it triggers a current capture.
    """
    snapshots = db.query(PortfolioSnapshot).filter(
        PortfolioSnapshot.portfolio_id == portfolio_id
    ).order_by(PortfolioSnapshot.snapshot_date.asc()).all()
    
    if not snapshots:
        # Try to capture current state if missing
        capture_portfolio_snapshot(db, portfolio_id, user_id)
        snapshots = db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == portfolio_id
        ).order_by(PortfolioSnapshot.snapshot_date.asc()).all()
        
    if not snapshots:
        return {
            "months": [],
            "values": [],
            "portfolioValue": 0,
            "totalInvested": 0,
            "totalProfit": 0,
            "topTicker": "--",
            "avgMonthlyProfit": 0
        }

    months_labels = [s.snapshot_date.strftime("%d/%m") for s in snapshots]
    historic_values = [float(s.market_value) for s in snapshots]
    
    latest = snapshots[-1]
    
    # Calculate top ticker from current holdings
    from app.services.portfolio_service import get_portfolio_holdings
    holdings = get_portfolio_holdings(db, portfolio_id, user_id)
    top_ticker = "--"
    if holdings and holdings.items:
        # Find item with max unrealized_pnl
        top_item = max(holdings.items, key=lambda x: x.unrealized_pnl)
        top_ticker = top_item.ticker
    
    total_market_val = float(latest.market_value)
    total_profit = float(latest.unrealized_pnl) if latest.unrealized_pnl else 0.0
    total_invested = float(latest.invested_value) if latest.invested_value else (total_market_val - total_profit)
    
    return {
        "months": months_labels,
        "values": historic_values,
        "portfolioValue": total_market_val,
        "totalInvested": total_invested,
        "totalProfit": total_profit,
        "topTicker": top_ticker,
        "avgMonthlyProfit": total_profit / 12.0 # Simple approx
    }

