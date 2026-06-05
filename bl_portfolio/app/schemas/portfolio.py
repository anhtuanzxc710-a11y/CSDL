from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class ViewInput(BaseModel):
    name: Optional[str] = Field(default=None, description="Tên view để trace/debug")
    type: Literal["absolute", "relative"] = Field(
        ..., description="absolute: view trên 1 mã; relative: view tương quan giữa nhiều mã"
    )
    assets: list[str] = Field(..., min_length=1, description="Danh sách mã liên quan đến view")
    q: float = Field(
        ...,
        description="Giá trị kỳ vọng của view. Ví dụ 0.12 là 12%/năm nếu đang annualize."
    )
    confidence: float = Field(
        ...,
        gt=0,
        le=1,
        description="Độ tin cậy trong khoảng (0, 1]."
    )
    pick_weights: Optional[list[float]] = Field(
        default=None,
        description="Trọng số của từng mã trong view. Nếu bỏ trống, relative view sẽ tự sinh."
    )

    @field_validator("assets")
    @classmethod
    def normalize_assets(cls, values: list[str]) -> list[str]:
        return [v.upper().strip() for v in values]

    @model_validator(mode="after")
    def validate_view(self):
        if self.type == "absolute":
            if len(self.assets) != 1:
                raise ValueError("Absolute view phải có đúng 1 asset.")
            if self.pick_weights is not None and len(self.pick_weights) != 1:
                raise ValueError("Absolute view chỉ nhận 1 pick_weight.")
        if self.type == "relative":
            if len(self.assets) < 2:
                raise ValueError("Relative view phải có ít nhất 2 asset.")
            if self.pick_weights is not None and len(self.pick_weights) != len(self.assets):
                raise ValueError("pick_weights phải cùng độ dài với assets.")
        return self


class OptimizeRequest(BaseModel):
    symbols: list[str] = Field(..., min_length=2, description="Danh sách mã cổ phiếu VN")
    start_date: date
    end_date: date
    interval: str = Field(default="1D", description="Chu kỳ dữ liệu, ví dụ 1D")
    risk_free_rate: float = Field(default=0.03, ge=0, description="Lãi suất phi rủi ro năm")
    tau: float = Field(default=0.05, gt=0, description="Hệ số bất định của prior")
    delta: float | None = Field(
        default=2.5,
        gt=0,
        description="Hệ số risk aversion của thị trường. Nếu không truyền sẽ dùng mặc định."
    )
    market_weights: dict[str, float] | None = Field(
        default=None,
        description="Trọng số thị trường/prior weights cho các mã. Nếu bỏ trống sẽ equal-weight."
    )
    views: list[ViewInput] = Field(default_factory=list)
    weight_min: float = Field(default=0.0, ge=0, le=1)
    weight_max: float = Field(default=1.0, ge=0, le=1)

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, values: list[str]) -> list[str]:
        normalized = [v.upper().strip() for v in values]
        if len(set(normalized)) != len(normalized):
            raise ValueError("symbols bị trùng.")
        return normalized

    @model_validator(mode="after")
    def validate_request(self):
        if self.start_date >= self.end_date:
            raise ValueError("start_date phải nhỏ hơn end_date.")
        if self.weight_min >= self.weight_max:
            raise ValueError("weight_min phải nhỏ hơn weight_max.")
        if self.market_weights:
            req_symbols = set(self.symbols)
            weight_symbols = set(k.upper().strip() for k in self.market_weights.keys())
            if req_symbols != weight_symbols:
                raise ValueError("market_weights phải chứa đúng các symbols đã truyền.")
            total = sum(self.market_weights.values())
            if total <= 0:
                raise ValueError("Tổng market_weights phải > 0.")
        return self


class OptimizeResponse(BaseModel):
    symbols: list[str]
    observations: int
    prior_returns: dict[str, float]
    posterior_returns: dict[str, float]
    weights: dict[str, float]
    annual_covariance: dict[str, dict[str, float]]
    expected_return: float
    volatility: float
    sharpe_ratio: float