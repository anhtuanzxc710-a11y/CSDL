import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Numeric, Date, BigInteger


from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base

class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class Transaction(Base):
    __tablename__ = "Transactions"
    __table_args__ = {"schema": "dbo"}

    id = Column("TransactionId", BigInteger, primary_key=True, index=True)
    portfolio_id = Column("PortfolioId", BigInteger, ForeignKey("dbo.Portfolios.PortfolioId", ondelete="CASCADE"), nullable=False, index=True)

    ticker = Column("Ticker", String(10), ForeignKey("dbo.Stocks.Ticker"), nullable=False, index=True)
    side = Column("Side", String(10), nullable=False) # 'BUY' or 'SELL'
    quantity = Column("Quantity", Numeric(18, 6), nullable=False)
    price = Column("Price", Numeric(18, 4), nullable=False)
    fee = Column("Fee", Numeric(18, 4), default=0, nullable=False)
    tax = Column("Tax", Numeric(18, 4), default=0, nullable=False)
    trade_date = Column("TradeDate", Date, nullable=False, index=True)
    note = Column("Note", String(255), nullable=True)
    source = Column("Source", String(20), default="manual", nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
    updated_at = Column("UpdatedAt", DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")

