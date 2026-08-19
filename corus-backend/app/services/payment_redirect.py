from urllib.parse import urlencode

from app.core.config import settings
from app.models.payment import PaymentPurpose

PAYMENT_CALLBACK_PATHS: dict[PaymentPurpose, str] = {
    PaymentPurpose.session_deposit: "/booking/payment/callback",
    PaymentPurpose.order_payment: "/checkout/callback",
    PaymentPurpose.rental_payment: "/rentals/payment/callback",
    PaymentPurpose.reservation_deposit: "/rentals/payment/callback",
}

DEFAULT_CALLBACK_PATH = "/checkout/callback"


def callback_path_for_purpose(purpose: PaymentPurpose | None) -> str:
    if purpose is None:
        return DEFAULT_CALLBACK_PATH
    return PAYMENT_CALLBACK_PATHS.get(purpose, DEFAULT_CALLBACK_PATH)


def frontend_callback_url(purpose: PaymentPurpose | None, reference: str) -> str:
    path = callback_path_for_purpose(purpose)
    base = settings.frontend_url.rstrip("/")
    query = urlencode({"reference": reference})
    return f"{base}{path}?{query}"
