import json
import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import DbSession
from app.models.webhook_event import WebhookProvider
from app.services.payment_confirmation import confirm_payment_success
from app.services.paystack import ensure_webhook_configured, verify_webhook_signature
from app.services.webhook_dedup import (
    build_event_id_from_payload,
    try_record_webhook_event,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/paystack")
async def paystack_webhook(request: Request, db: DbSession) -> dict:
    ensure_webhook_configured()

    body = await request.body()
    signature = request.headers.get("x-paystack-signature")
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")

    if not verify_webhook_signature(body, signature):
        logger.warning("Invalid Paystack webhook signature from %s", client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    payload = json.loads(body)
    event, event_id, data = build_event_id_from_payload(payload)
    reference = data.get("reference")

    is_new = try_record_webhook_event(
        db,
        provider=WebhookProvider.paystack,
        event_id=event_id,
        reference=reference,
    )
    if not is_new:
        return {"status": "already_processed"}

    try:
        if event == "charge.success" and reference:
            confirm_payment_success(db, reference, data)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Paystack webhook processing failed reference=%s event_id=%s", reference, event_id)
        raise

    return {"status": "ok"}
