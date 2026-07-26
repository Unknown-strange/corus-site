import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.services.email import send_email
from app.services.email_templates import EmailTemplate, render_otp_email

logger = logging.getLogger(__name__)


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str) -> str:
    payload = f"{code}:{settings.secret_key}"
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_otp_code(code: str, otp_hash: str) -> bool:
    return hash_otp(code) == otp_hash


def otp_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=settings.otp_expire_minutes)


def send_otp_email(
    to_email: str,
    otp_code: str,
    template: EmailTemplate,
    recipient_name: str | None = None,
) -> bool:
    subject, plain_text, html = render_otp_email(
        template=template,
        otp_code=otp_code,
        expire_minutes=settings.otp_expire_minutes,
        recipient_name=recipient_name,
    )
    return send_email(to_email, subject, plain_text, html)
