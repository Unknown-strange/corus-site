from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PendingReservationItem(BaseModel):
    id: UUID
    customer_email: str | None
    customer_name: str | None
    requested_start: datetime
    requested_end: datetime
    purpose: str | None
    created_at: datetime


class LowStockProductItem(BaseModel):
    id: UUID
    name: str
    slug: str
    stock: int
    low_stock_threshold: int


class TodayBookingItem(BaseModel):
    id: UUID
    user_id: UUID
    session_type_name: str
    slot_starts_at: datetime
    slot_ends_at: datetime
    status: str


class DashboardFinancialSummary(BaseModel):
    total_income_ghs: Decimal
    total_expenses_ghs: Decimal
    profit_ghs: Decimal
    period_start: datetime
    period_end: datetime


class DashboardSummaryResponse(BaseModel):
    pending_reservation_approvals: int
    pending_reservations_top: list[PendingReservationItem]
    low_stock_products: list[LowStockProductItem]
    low_stock_count: int
    todays_bookings: list[TodayBookingItem]
    todays_bookings_count: int
    active_rentals: int
    pending_orders: int
    payments_today_ghs: Decimal
    financial_summary: DashboardFinancialSummary
    studio_timezone: str


class ActivityFeedItem(BaseModel):
    id: UUID
    event_type: str
    title: str
    description: str | None
    user_id: UUID
    occurred_at: datetime
    reference_id: str
