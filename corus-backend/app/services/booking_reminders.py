"""Send booking reminder emails for upcoming confirmed sessions."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.session_type import SessionType
from app.models.user import User
from app.services.email_templates import render_booking_reminder_email
from app.services.notification_service import dispatch_email, reminder_already_sent


def send_booking_reminders(db: Session, *, dry_run: bool = False) -> int:
    now = datetime.now(UTC)
    window_start = now + timedelta(hours=settings.booking_reminder_hours)
    window_end = window_start + timedelta(hours=1)

    bookings = (
        db.query(Booking)
        .options(joinedload(Booking.slot))
        .filter(Booking.status == BookingStatus.confirmed)
        .all()
    )

    count = 0
    for booking in bookings:
        if booking.slot is None:
            continue
        slot_start = booking.slot.starts_at.replace(tzinfo=UTC)
        if not (window_start <= slot_start < window_end):
            continue
        if reminder_already_sent(db, booking.id):
            continue

        user = db.get(User, booking.user_id)
        session_type = db.get(SessionType, booking.session_type_id)
        if not user or not user.email or not session_type:
            continue

        subject, plain, html = render_booking_reminder_email(
            recipient_name=user.first_name,
            session_name=session_type.name,
            slot_starts_at=booking.slot.starts_at,
            slot_ends_at=booking.slot.ends_at,
            balance_due_ghs=booking.balance_due_ghs,
        )

        if dry_run:
            print(f"[DRY RUN] Would remind {user.email} for booking {booking.id}")
            count += 1
            continue

        dispatch_email(
            db,
            to_email=user.email,
            subject=subject,
            plain_text=plain,
            html=html,
            event_type="booking_reminder",
            user_id=user.id,
            reference_type="booking",
            reference_id=booking.id,
        )
        count += 1

    return count
