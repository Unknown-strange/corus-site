from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.studio_reservation import ReservationStatus, StudioReservation
from app.models.user import User
from app.services.email import send_email
from app.services.email_templates import render_reservation_expired_email


def expire_unpaid_reservation_approvals(db: Session) -> int:
    now = datetime.now(UTC)
    expired = (
        db.query(StudioReservation)
        .filter(
            StudioReservation.status == ReservationStatus.approved,
            StudioReservation.payment_deadline.isnot(None),
            StudioReservation.payment_deadline < now,
        )
        .all()
    )

    count = 0
    for reservation in expired:
        reservation.status = ReservationStatus.expired
        db.add(reservation)
        count += 1

        user = db.get(User, reservation.user_id)
        if user and user.email:
            subject, plain, html = render_reservation_expired_email(
                recipient_name=user.first_name,
                requested_start=reservation.requested_start,
                requested_end=reservation.requested_end,
            )
            send_email(user.email, subject, plain, html)

    if count:
        db.commit()
    return count
