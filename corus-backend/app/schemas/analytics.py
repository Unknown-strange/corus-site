import enum
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TrendInterval(str, enum.Enum):
    day = "day"
    week = "week"
    month = "month"


class TrendPoint(BaseModel):
    bucket: date
    count: int
    revenue_ghs: Decimal


class TopItem(BaseModel):
    id: UUID | None
    name: str
    count: int
    revenue_ghs: Decimal


class TrendResponse(BaseModel):
    interval: TrendInterval
    period_start: datetime
    period_end: datetime
    total_count: int
    total_revenue_ghs: Decimal
    points: list[TrendPoint]
    top_items: list[TopItem]


class AnalyticsOverviewResponse(BaseModel):
    interval: TrendInterval
    period_start: datetime
    period_end: datetime
    bookings: TrendResponse
    rentals: TrendResponse
    products: TrendResponse
    studio_timezone: str
