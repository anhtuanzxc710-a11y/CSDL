from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.base import Base
from sqlalchemy import Unicode

class Stock(Base):
    __tablename__ = "Stocks"
    __table_args__ = {"schema": "dbo"}

    ticker = Column("Ticker", String(10), primary_key=True, index=True)
    company_name = Column("CompanyName", Unicode(255), nullable=False)
    sector = Column("Sector", Unicode(100), nullable=True)
    exchange = Column("Exchange", Unicode(50), nullable=True)
    status = Column("Status", String(20), default="active", nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
