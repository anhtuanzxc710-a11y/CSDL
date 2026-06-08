from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base

class Report(Base):
    __tablename__ = "Reports"
    __table_args__ = {"schema": "dbo"}

    id = Column("ReportId", BigInteger, primary_key=True, index=True)
    user_id = Column("UserId", BigInteger, ForeignKey("dbo.Users.UserId"), nullable=False, index=True)
    portfolio_id = Column("PortfolioId", BigInteger, ForeignKey("dbo.Portfolios.PortfolioId"), nullable=True)

    report_type = Column("ReportType", String(30), nullable=False) # 'portfolio', 'risk', 'transactions', 'summary'
    format = Column("Format", String(10), nullable=False) # 'pdf', 'csv', 'json'
    storage_path = Column("StoragePath", String(255), nullable=False)
    status = Column("Status", String(20), default="completed", nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="reports")

class AuditLog(Base):
    __tablename__ = "AuditLogs"
    __table_args__ = {"schema": "dbo"}

    id = Column("AuditLogId", BigInteger, primary_key=True, index=True)
    user_id = Column("UserId", BigInteger, ForeignKey("dbo.Users.UserId"), nullable=True, index=True)

    action = Column("Action", String(100), nullable=False, index=True)
    entity_type = Column("EntityType", String(50), nullable=False)
    entity_id = Column("EntityId", String(50), nullable=True)
    detail_json = Column("DetailJson", Text, nullable=True) # NVARCHAR(MAX)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="audit_logs")

