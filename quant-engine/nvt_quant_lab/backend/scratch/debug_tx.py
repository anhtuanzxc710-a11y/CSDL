
import sys
import os
from datetime import datetime

# Adjust path to import app and core
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services import portfolio_service
from app.schemas.transaction import TransactionCreate
from app.models.transaction import TransactionType

def test_add_transaction():
    db = SessionLocal()
    try:
        # We need a user_id and portfolio_id that exist
        # From logs, portfolio 13 was used
        portfolio_id = 13
        
        # Find the user for this portfolio
        from app.models.portfolio import Portfolio
        portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            print(f"Portfolio {portfolio_id} not found in DB. Creating a dummy portfolio for testing.")
            # Let's find any user
            from app.models.user import User
            user = db.query(User).first()
            if not user:
                print("No users in DB. Cannot test.")
                return
            
            p_in = type('obj', (object,), {'dict': lambda: {'name': 'Test P', 'description': ''}})
            portfolio = portfolio_service.create_portfolio(db, p_in, user.id)
            portfolio_id = portfolio.id
            user_id = user.id
        else:
            user_id = portfolio.user_id
            
        print(f"Testing add_transaction for Portfolio {portfolio_id}, User {user_id}")
        
        tx_in = TransactionCreate(
            ticker="FPT",
            side=TransactionType.BUY,
            quantity=100.0,
            price=105000.0,
            fee=0.0,
            tax=0.0,
            trade_date=datetime.utcnow(),
            note="Test transaction"
        )
        
        tx = portfolio_service.add_transaction(db, portfolio_id, user_id, tx_in)
        print(f"Success! Transaction ID: {tx.id}")
        
    except Exception as e:
        print("FAILED with exception:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_add_transaction()
