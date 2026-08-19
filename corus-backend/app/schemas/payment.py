from pydantic import BaseModel


class PaymentVerifyResponse(BaseModel):
    status: str
    reference: str
    callback_path: str | None = None
    booking_id: str | None = None
    rental_id: str | None = None
    reservation_id: str | None = None
    order_id: str | None = None
    message: str
