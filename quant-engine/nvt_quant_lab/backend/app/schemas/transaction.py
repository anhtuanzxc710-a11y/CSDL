from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.transaction import TransactionType

class TransactionBase(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    side: TransactionType
    quantity: float
    price: float
    fee: float = 0.0
    tax: float = 0.0
    trade_date: Optional[datetime] = None
    note: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    ticker: Optional[str] = None
    side: Optional[TransactionType] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    fee: Optional[float] = None
    tax: Optional[float] = None
    trade_date: Optional[datetime] = None
    note: Optional[str] = None

class TransactionInDBBase(TransactionBase):
    id: int
    portfolio_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Transaction(TransactionInDBBase):
    pass
