import hashlib
import json
import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.webhook_event import WebhookEvent, WebhookProvider

logger = logging.getLogger(__name__)


def build_event_id(event: str, data: dict) -> str:
    paystack_id = data.get("id")
    if paystack_id is not None:
        return f"{event}:{paystack_id}"
    reference = data.get("reference", "")
    created = data.get("created_at", data.get("paid_at", ""))
    raw = f"{event}:{reference}:{created}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def try_record_webhook_event(
    db: Session,
    *,
    provider: WebhookProvider,
    event_id: str,
    reference: str | None,
) -> bool:
    """Returns True if this is a new event; False if already processed."""
    existing = (
        db.query(WebhookEvent)
        .filter(
            WebhookEvent.provider == provider,
            WebhookEvent.event_id == event_id,
        )
        .first()
    )
    if existing is not None:
        logger.info(
            "Duplicate webhook event ignored provider=%s event_id=%s reference=%s",
            provider.value,
            event_id,
            reference,
        )
        return False

    entry = WebhookEvent(
        provider=provider,
        event_id=event_id,
        reference=reference,
    )
    db.add(entry)
    try:
        db.flush()
        return True
    except IntegrityError:
        db.rollback()
        logger.info(
            "Concurrent duplicate webhook event provider=%s event_id=%s",
            provider.value,
            event_id,
        )
        return False


def build_event_id_from_payload(payload: dict) -> tuple[str, str, dict]:
    event = payload.get("event", "unknown")
    data = payload.get("data") or {}
    if not isinstance(data, dict):
        data = {}
    event_id = build_event_id(event, data)
    reference = data.get("reference")
    return event, event_id, data
