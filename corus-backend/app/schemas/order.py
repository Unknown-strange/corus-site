from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class OrderCheckoutResponse(BaseModel):
    order_id: UUID
    authorization_url: str
    reference: str
    public_key: str
    amount_ghs: Decimal


class OrderItemResponse(BaseModel):
    product_id: UUID
    product_name: str
    unit_price_ghs: Decimal
    quantity: int
    line_total_ghs: Decimal


class ReceiptSummary(BaseModel):
    receipt_number: str
    amount_ghs: Decimal
    issued_at: datetime

    model_config = {"from_attributes": True}


class OrderDetailResponse(BaseModel):
    id: UUID
    status: str
    total_ghs: Decimal
    paystack_reference: str | None
    payment_expires_at: datetime | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
    receipt: ReceiptSummary | None = None


class OrderAdminResponse(BaseModel):
    id: UUID
    user_id: UUID
    customer_email: str | None
    customer_name: str | None
    status: str
    total_ghs: Decimal
    paystack_reference: str | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]


class OrderStatusUpdateRequest(BaseModel):
    status: str
