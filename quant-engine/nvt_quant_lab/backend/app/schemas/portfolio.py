from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# Used for the compatible map format
class HoldingItem(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    market_price: float = 0
    market_value: float = 0
    unrealized_pnl: float = 0
    weight: float = 0

class HoldingsResponse(BaseModel):
    map: Dict[str, float]
    items: List[HoldingItem]

class PortfolioBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "custom"
    base_currency: str = "VND"

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

class PortfolioInDBBase(PortfolioBase):
    id: int
    user_id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Portfolio(PortfolioInDBBase):
    pass
