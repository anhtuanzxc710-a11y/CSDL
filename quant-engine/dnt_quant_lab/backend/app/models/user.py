from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy import Unicode

from app.db.base import Base

class User(Base):
    __tablename__ = "Users"
    __table_args__ = {"schema": "dbo"}

    id = Column("UserId", BigInteger, primary_key=True, index=True)

    username = Column("Username", Unicode(50), unique=True, index=True, nullable=False)
    email = Column("Email", String(100), unique=True, index=True, nullable=False)
    hashed_password = Column("PasswordHash", String(255), nullable=False)
    full_name = Column("FullName", Unicode(100), index=True)
    avatar_url = Column("AvatarUrl", String(255), nullable=True)
    role = Column("Role", String(20), default="user", nullable=False)
    is_active = Column("IsActive", Boolean(), default=True, nullable=False)
    is_email_verified = Column("IsEmailVerified", Boolean(), default=False, nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
    updated_at = Column("UpdatedAt", DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete")

