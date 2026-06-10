from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy import Unicode

from app.db.base import Base

class ChatThread(Base):
    __tablename__ = "ChatThreads"
    __table_args__ = {"schema": "dbo"}

    id = Column("ThreadId", BigInteger, primary_key=True, index=True)
    user_id = Column("UserId", BigInteger, ForeignKey("dbo.Users.UserId"), nullable=False, index=True)
    portfolio_id = Column("PortfolioId", BigInteger, ForeignKey("dbo.Portfolios.PortfolioId"), nullable=True)

    title = Column("Title", Unicode(255), default="New Conversation")
    thread_type = Column("ThreadType", String(30), default="assistant", nullable=False)
    metadata_json = Column("MetadataJson", Text, nullable=True) # NVARCHAR(MAX)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)
    updated_at = Column("UpdatedAt", DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="chat_threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "ChatMessages"
    __table_args__ = {"schema": "dbo"}

    id = Column("MessageId", BigInteger, primary_key=True, index=True)
    thread_id = Column("ThreadId", BigInteger, ForeignKey("dbo.ChatThreads.ThreadId", ondelete="CASCADE"), nullable=False, index=True)

    role = Column("Role", String(20), nullable=False) # 'user', 'assistant', 'system'
    content = Column("Content", Unicode, nullable=False)
    tokens_used = Column("TokensUsed", Integer, nullable=True)
    status = Column("Status", String(20), default="completed", nullable=False)
    created_at = Column("CreatedAt", DateTime, server_default=func.now(), nullable=False)

    # Relationships
    thread = relationship("ChatThread", back_populates="messages")

