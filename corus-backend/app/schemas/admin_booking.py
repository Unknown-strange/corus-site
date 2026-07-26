from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class AdminBookingResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    deposit_amount_ghs: Decimal
    total_price_ghs: Decimal
    balance_due_ghs: Decimal
    session_type_name: str
    slot_starts_at: datetime
    slot_ends_at: datetime
    confirmed_at: datetime | None
    created_at: datetime
