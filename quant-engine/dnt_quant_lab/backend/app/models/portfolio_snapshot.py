from sqlalchemy import Column, Integer, ForeignKey, Numeric, Date, DateTime, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base

class PortfolioSnapshot(Base):
    __tablename__ = "PortfolioSnapshots"
    __table_args__ = {"schema": "dbo"}

    id = Column("SnapshotId", BigInteger, primary_key=True, index=True)
    portfolio_id = Column("PortfolioId", BigInteger, ForeignKey("dbo.Portfolios.PortfolioId", ondelete="CASCADE"), nullable=False, index=True)

    snapshot_date = Column("SnapshotDate", Date, nullable=False, index=True)
    
    cash_value = Column("CashValue", Numeric(18, 4), nullable=False, default=0)
    invested_value = Column("InvestedValue", Numeric(18, 4), nullable=False, default=0)
    market_value = Column("MarketValue", Numeric(18, 4), nullable=False, default=0)
    total_value = Column("TotalValue", Numeric(18, 4), nullable=False, default=0)
    realized_pnl = Column("RealizedPnl", Numeric(18, 4), nullable=False, default=0)
    unrealized_pnl = Column("UnrealizedPnl", Numeric(18, 4), nullable=False, default=0)
    daily_return_pct = Column("DailyReturnPct", Numeric(10, 6), nullable=True)
    benchmark_value = Column("BenchmarkValue", Numeric(18, 4), nullable=True)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    portfolio = relationship("Portfolio", backref="snapshots")

