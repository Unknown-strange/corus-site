from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ReceiptLineItemResponse(BaseModel):
    description: str
    quantity: int = 1
    unit_price_ghs: Decimal | None = None
    line_total_ghs: Decimal | None = None
    detail: str | None = None


class ReceiptSummaryResponse(BaseModel):
    id: UUID
    receipt_number: str
    receipt_type: str | None
    amount_ghs: Decimal
    issued_at: datetime

    model_config = {"from_attributes": True}


class ReceiptDetailResponse(BaseModel):
    id: UUID
    receipt_number: str
    receipt_type: str | None
    amount_ghs: Decimal
    issued_at: datetime
    line_items: list[ReceiptLineItemResponse]
    amount_paid_ghs: Decimal | None = None
    total_price_ghs: Decimal | None = None
    balance_due_ghs: Decimal | None = None
    payment_reference: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None

    model_config = {"from_attributes": True}
