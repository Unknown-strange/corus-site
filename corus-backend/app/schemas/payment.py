from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentReceiptSummary(BaseModel):
    receipt_number: str
    amount_ghs: Decimal
    issued_at: datetime


class PaymentVerifyResponse(BaseModel):
    status: str
    reference: str
    callback_path: str | None = None
    booking_id: str | None = None
    rental_id: str | None = None
    reservation_id: str | None = None
    order_id: str | None = None
    message: str
    amount_ghs: Decimal | None = None
    receipt_number: str | None = None
    issued_at: datetime | None = None
    receipt: PaymentReceiptSummary | None = None
