from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    hold_id: UUID


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
    deposit_amount_ghs: Decimal
    total_price_ghs: Decimal
    balance_due_ghs: Decimal
    paystack_reference: str | None
    confirmed_at: datetime | None
    created_at: datetime
    session_type_name: str
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
