from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ReservationSubmitRequest(BaseModel):
    requested_start: datetime
    requested_end: datetime
    purpose: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class ReservationCheckoutResponse(BaseModel):
    reservation_id: UUID
    authorization_url: str
    reference: str
    public_key: str
    amount_ghs: Decimal
    balance_due_ghs: Decimal


class ReservationDetailResponse(BaseModel):
    id: UUID
    status: str
    requested_start: datetime
    requested_end: datetime
    purpose: str | None
    notes: str | None
    approved_price_ghs: Decimal | None
    deposit_amount_ghs: Decimal | None
    balance_due_ghs: Decimal | None
    approved_at: datetime | None
    payment_deadline: datetime | None
    paystack_reference: str | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime


class ReservationApproveRequest(BaseModel):
    approved_price_ghs: Decimal = Field(gt=0)


class ReservationRejectRequest(BaseModel):
    rejection_reason: str | None = None


class PendingReservationApprovalResponse(BaseModel):
    id: UUID
    user_id: UUID
    customer_email: str | None
    customer_name: str | None
    requested_start: datetime
    requested_end: datetime
    purpose: str | None
    notes: str | None
    created_at: datetime


class ReservationAdminResponse(BaseModel):
    id: UUID
    user_id: UUID
    customer_email: str | None
    customer_name: str | None
    status: str
    requested_start: datetime
    requested_end: datetime
    purpose: str | None
    notes: str | None
    approved_price_ghs: Decimal | None
    deposit_amount_ghs: Decimal | None
    balance_due_ghs: Decimal | None
    approved_at: datetime | None
    payment_deadline: datetime | None
    paystack_reference: str | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime
