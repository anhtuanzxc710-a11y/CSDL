from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base

class RefreshToken(Base):
    __tablename__ = "RefreshTokens"
    __table_args__ = {"schema": "dbo"}

    id = Column("TokenId", BigInteger, primary_key=True, index=True)
    user_id = Column("UserId", BigInteger, ForeignKey("dbo.Users.UserId", ondelete="CASCADE"), nullable=False)

    token_hash = Column("TokenHash", String(255), unique=True, index=True, nullable=False)
    user_agent = Column("UserAgent", String(255), nullable=True)
    ip_address = Column("IpAddress", String(64), nullable=True)
    expires_at = Column("ExpiresAt", DateTime, nullable=False)
    revoked_at = Column("RevokedAt", DateTime, nullable=True)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

