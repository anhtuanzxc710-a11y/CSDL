import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import all SQLAlchemy models to prevent relationship mapping errors
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.chat import ChatThread, ChatMessage
from app.models.system import Report, AuditLog
from app.models.stocks import Stock

from app.core.config import settings
from app.services.portfolio_service import get_portfolio_holdings

def safe_str(s):
    if s is None:
        return ""
    return str(s).encode('ascii', 'replace').decode()

print(f"Connecting to database...")
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Portfolios ---")
portfolios = db.query(Portfolio).all()
for p in portfolios:
    print(f"ID: {p.id}, Name: {safe_str(p.name)}, User ID: {p.user_id}, Default: {p.is_default}")

print("\n--- Transactions ---")
for t in db.query(Transaction).all():
    print(f"ID: {t.id}, Ptf ID: {t.portfolio_id}, Ticker: {safe_str(t.ticker)}, Side: {safe_str(t.side)}, Qty: {t.quantity}, Price: {t.price}, Date: {t.trade_date}")

print("\n--- Holdings ---")
for p in portfolios:
    try:
        holdings = get_portfolio_holdings(db, p.id, p.user_id)
        if holdings and holdings.items:
            print(f"Portfolio {p.id} ({safe_str(p.name)}) holdings:")
            for item in holdings.items:
                print(f"  Ticker: {safe_str(item.ticker)}, Qty: {item.quantity}, Avg Cost: {item.avg_cost}, Market Price: {item.market_price}, Market Value: {item.market_value}")
    except Exception as e:
        print(f"Error getting holdings for portfolio {p.id}: {e}")
db.close()
