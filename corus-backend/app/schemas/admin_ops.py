from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PaymentAdminListItem(BaseModel):
    id: UUID
    user_id: UUID
    customer_email: str | None
    customer_name: str | None
    reference: str
    amount_ghs: Decimal
    currency: str
    status: str
    purpose: str
    receipt_id: UUID | None
    receipt_number: str | None
    created_at: datetime


class PaymentAdminDetailResponse(PaymentAdminListItem):
    booking_id: UUID | None
    rental_request_id: UUID | None
    reservation_id: UUID | None
    order_id: UUID | None
    paystack_response: dict | None
    updated_at: datetime


class CustomerListItem(BaseModel):
    id: UUID
    email: str | None
    username: str | None
    first_name: str | None
    last_name: str | None
    is_active: bool
    email_verified: bool
    created_at: datetime


class CustomerOrderSummary(BaseModel):
    id: UUID
    status: str
    total_ghs: Decimal
    created_at: datetime


class CustomerBookingSummary(BaseModel):
    id: UUID
    status: str
    session_type_name: str | None
    created_at: datetime


class CustomerDetailResponse(CustomerListItem):
    recent_orders: list[CustomerOrderSummary]
    recent_bookings: list[CustomerBookingSummary]


class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: UUID | None
    actor_role: str | None
    action: str
    resource_type: str | None
    resource_id: str | None
    metadata_json: dict | None
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
