import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.product import ProductForSale
from app.models.user import User, UserRole
from app.services.email import send_email
from app.services.email_templates import render_low_stock_email

logger = logging.getLogger(__name__)


def _admin_alert_recipients(db: Session) -> list[str]:
    if settings.admin_alert_email:
        return [settings.admin_alert_email]

    admins = (
        db.query(User)
        .filter(User.role == UserRole.admin, User.is_active.is_(True), User.email.isnot(None))
        .all()
    )
    emails = [admin.email for admin in admins if admin.email]
    if emails:
        return emails

    if settings.email_from:
        return [settings.email_from]

    return []


def should_send_low_stock_alert(previous_stock: int, new_stock: int, threshold: int) -> bool:
    return previous_stock > threshold >= new_stock


def maybe_send_low_stock_alert(db: Session, product: ProductForSale) -> None:
    recipients = _admin_alert_recipients(db)
    if not recipients:
        logger.warning("Low stock alert skipped — no admin alert email configured")
        return

    subject, plain_text, html = render_low_stock_email(
        product_name=product.name,
        stock=product.stock,
        threshold=product.effective_low_stock_threshold,
        price=product.price,
    )

    for email in recipients:
        send_email(email, subject, plain_text, html)


def check_stock_crossing_alert(
    db: Session,
    product: ProductForSale,
    previous_stock: int,
) -> None:
    threshold = product.effective_low_stock_threshold
    if should_send_low_stock_alert(previous_stock, product.stock, threshold):
        maybe_send_low_stock_alert(db, product)
