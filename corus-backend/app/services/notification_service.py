import logging
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification_log import NotificationChannel, NotificationLog, NotificationStatus
from app.models.user import User, UserRole
from app.services.email import send_email

logger = logging.getLogger(__name__)


def _admin_recipients(db: Session) -> list[str]:
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


def dispatch_email(
    db: Session,
    *,
    to_email: str,
    subject: str,
    plain_text: str,
    html: str,
    event_type: str,
    user_id: uuid.UUID | None = None,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
    force_send: bool = False,
    pdf_attachment: tuple[str, bytes] | None = None,
    send_admin_copy: bool = False,
) -> bool:
    success = send_email(
        to_email,
        subject,
        plain_text,
        html,
        force_send=force_send,
        pdf_attachment=pdf_attachment,
    )
    _log_notification(
        db,
        user_id=user_id,
        event_type=event_type,
        recipient=to_email,
        subject=subject,
        status=NotificationStatus.sent if success else NotificationStatus.failed,
        reference_type=reference_type,
        reference_id=reference_id,
    )

    if send_admin_copy and settings.admin_email_copy:
        admin_subject = f"[Admin copy] {subject}"
        for admin_email in _admin_recipients(db):
            if admin_email == to_email:
                continue
            admin_ok = send_email(
                admin_email,
                admin_subject,
                plain_text,
                html,
                force_send=force_send,
                pdf_attachment=pdf_attachment,
            )
            _log_notification(
                db,
                user_id=None,
                event_type=f"{event_type}_admin_copy",
                recipient=admin_email,
                subject=admin_subject,
                status=NotificationStatus.sent if admin_ok else NotificationStatus.failed,
                reference_type=reference_type,
                reference_id=reference_id,
            )

    db.commit()
    return success


def _log_notification(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    event_type: str,
    recipient: str,
    subject: str,
    status: NotificationStatus,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
    error_message: str | None = None,
) -> None:
    db.add(
        NotificationLog(
            user_id=user_id,
            channel=NotificationChannel.email,
            event_type=event_type,
            recipient=recipient,
            subject=subject,
            status=status,
            reference_type=reference_type,
            reference_id=reference_id,
            error_message=error_message,
        )
    )


def reminder_already_sent(db: Session, booking_id: uuid.UUID) -> bool:
    existing = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.event_type == "booking_reminder",
            NotificationLog.reference_type == "booking",
            NotificationLog.reference_id == booking_id,
            NotificationLog.status == NotificationStatus.sent,
        )
        .first()
    )
    return existing is not None
