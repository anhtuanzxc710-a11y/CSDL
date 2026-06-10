import sys
import os
import datetime
from sqlalchemy.orm import Session

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.services.performance_service import capture_portfolio_snapshot

def rebuild_history(portfolio_id: int, user_id: int, days: int = 30):
    db = SessionLocal()
    try:
        print(f"Rebuilding history for Portfolio {portfolio_id} (last {days} days)...")
        end_date = datetime.date.today()
        for i in range(days, -1, -1):
            target_date = end_date - datetime.timedelta(days=i)
            print(f"  Capturing snapshot for {target_date}...")
            capture_portfolio_snapshot(db, portfolio_id, user_id, snapshot_date=target_date)
        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python rebuild_history.py <portfolio_id> <user_id>")
    else:
        pid = int(sys.argv[1])
        uid = int(sys.argv[2])
        rebuild_history(pid, uid)
