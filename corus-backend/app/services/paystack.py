import hashlib
import hmac
import logging
import uuid

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = "https://api.paystack.co"


def verify_webhook_signature(payload: bytes, signature: str | None) -> bool:
    if not settings.paystack_secret_key:
        return False
    if not signature:
        return False
    computed = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def ensure_webhook_configured() -> None:
    """Raise 503 in production when Paystack secret is missing."""
    if not settings.paystack_secret_key:
        if settings.debug:
            return
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack webhook is not configured",
        )


def generate_reference() -> str:
    return f"corus_{uuid.uuid4().hex}"


def initialize_transaction(
    email: str,
    amount_pesewas: int,
    reference: str,
    metadata: dict,
) -> dict:
    if not settings.paystack_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    payload = {
        "email": email,
        "amount": amount_pesewas,
        "currency": "GHS",
        "reference": reference,
        "metadata": metadata,
    }
    if settings.paystack_callback_url:
        payload["callback_url"] = settings.paystack_callback_url

    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                json=payload,
                headers=headers,
            )
            data = response.json()
    except Exception as exc:
        logger.exception("Paystack initialize failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment initialization failed",
        ) from exc

    if not data.get("status"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=data.get("message", "Payment initialization failed"),
        )

    return data["data"]


def verify_transaction(reference: str) -> dict:
    if not settings.paystack_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    headers = {"Authorization": f"Bearer {settings.paystack_secret_key}"}

    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=headers,
            )
            data = response.json()
    except Exception as exc:
        logger.exception("Paystack verify failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment verification failed",
        ) from exc

    if not data.get("status"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=data.get("message", "Payment verification failed"),
        )

    return data["data"]
