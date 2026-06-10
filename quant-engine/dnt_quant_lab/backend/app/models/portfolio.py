from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy import Unicode

from app.db.base import Base

class Portfolio(Base):
    __tablename__ = "Portfolios"
    __table_args__ = {"schema": "dbo"}

    id = Column("PortfolioId", BigInteger, primary_key=True, index=True)
    user_id = Column("UserId", BigInteger, ForeignKey("dbo.Users.UserId", ondelete="CASCADE"), nullable=False)

    name = Column("Name", Unicode(100), nullable=False)
    description = Column("Description", Unicode, nullable=True)
    type = Column("Type", String(20), nullable=False) # 'optimizer', 'evaluator', 'saved', 'custom'
    base_currency = Column("BaseCurrency", String(10), default="VND", nullable=False)
    is_default = Column("IsDefault", Boolean, default=False, nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
    updated_at = Column("UpdatedAt", DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="portfolios")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")

