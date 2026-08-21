from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class WalkInPaymentMethod(str, Enum):
    offline = "offline"
    online = "online"


class WalkInBookingCreateRequest(BaseModel):
    customer_full_name: str = Field(min_length=1, max_length=200)
    customer_phone: str = Field(min_length=5, max_length=20)
    customer_email: EmailStr | None = None
    session_type_id: UUID | None = Field(
        default=None,
        description="Optional template package from admin session types",
    )
    package_name: str = Field(min_length=1, max_length=150)
    package_description: str | None = None
    package_price_ghs: Decimal = Field(gt=0)
    package_duration_minutes: int = Field(default=60, ge=15, le=480)
    slot_id: UUID
    pictures_count: int = Field(ge=0)
    picture_pickup_date: date
    accepted_at: datetime | None = None
    payment_method: WalkInPaymentMethod
    amount_paid_ghs: Decimal | None = Field(
        default=None,
        gt=0,
        description="Required for offline payment — cash/transfer amount collected now",
    )

    @model_validator(mode="after")
    def validate_payment_amount(self) -> "WalkInBookingCreateRequest":
        if self.payment_method == WalkInPaymentMethod.offline and self.amount_paid_ghs is None:
            raise ValueError("amount_paid_ghs is required for offline walk-in payment")
        if (
            self.payment_method == WalkInPaymentMethod.offline
            and self.amount_paid_ghs is not None
            and self.amount_paid_ghs > self.package_price_ghs
        ):
            raise ValueError("amount_paid_ghs cannot exceed package_price_ghs")
        return self


class WalkInBookingCreateResponse(BaseModel):
    booking_id: UUID
    payment_method: WalkInPaymentMethod
    status: str | None = None
    reference: str
    amount_paid_ghs: Decimal | None = None
    total_price_ghs: Decimal
    balance_due_ghs: Decimal
    receipt_number: str | None = None
    authorization_url: str | None = None
    public_key: str | None = None
    message: str | None = None


class WalkInBookingDetailResponse(BaseModel):
    id: UUID
    status: str
    booking_source: str
    payment_method: str | None
    customer_full_name: str | None
    customer_email: str | None
    customer_phone: str | None
    package_name: str
    package_description: str | None
    package_price_ghs: Decimal
    package_duration_minutes: int | None
    pictures_count: int | None
    picture_pickup_date: date | None
    accepted_at: datetime | None
    deposit_amount_ghs: Decimal
    total_price_ghs: Decimal
    balance_due_ghs: Decimal
    paystack_reference: str | None
    slot_starts_at: datetime
    slot_ends_at: datetime
    confirmed_at: datetime | None
    created_at: datetime
    receipt_number: str | None = None
