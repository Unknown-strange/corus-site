from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    hold_id: UUID
    pictures_count: int | None = Field(default=None, ge=0)
    picture_pickup_date: date | None = None
    accepted_at: datetime | None = None
    package_name: str | None = Field(default=None, max_length=150)
    package_description: str | None = None
    package_price_ghs: Decimal | None = Field(default=None, gt=0)
    package_duration_minutes: int | None = Field(default=None, ge=15, le=480)


class CheckoutResponse(BaseModel):
    booking_id: UUID
    authorization_url: str
    reference: str
    public_key: str
    amount_ghs: Decimal


class ReceiptSummary(BaseModel):
    receipt_number: str
    amount_ghs: Decimal
    issued_at: datetime

    model_config = {"from_attributes": True}


class BookingDetailResponse(BaseModel):
    id: UUID
    status: str
    booking_source: str
    payment_method: str | None
    deposit_amount_ghs: Decimal
    total_price_ghs: Decimal
    balance_due_ghs: Decimal
    paystack_reference: str | None
    confirmed_at: datetime | None
    created_at: datetime
    session_type_name: str
    package_name: str | None = None
    package_description: str | None = None
    package_duration_minutes: int | None = None
    pictures_count: int | None = None
    picture_pickup_date: date | None = None
    accepted_at: datetime | None = None
    slot_starts_at: datetime
    slot_ends_at: datetime
    receipt: ReceiptSummary | None = None


class BookingSettingsResponse(BaseModel):
    session_deposit_ghs: Decimal
    reservation_deposit_ghs: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingSettingsUpdateRequest(BaseModel):
    session_deposit_ghs: Decimal | None = None
    reservation_deposit_ghs: Decimal | None = None
