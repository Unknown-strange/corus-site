from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.studio_reservation import ReservationStatus, StudioReservation
from app.models.user import User
from app.services.email import send_email
from app.services.email_templates import (
    render_reservation_approved_email,
    render_reservation_rejected_email,
    render_reservation_submitted_email,
)
from app.services.paystack import generate_reference, initialize_transaction
from app.services.slot_availability import get_reservation_deposit_ghs


def _payment_deadline() -> datetime:
    return datetime.now(UTC) + timedelta(hours=settings.post_approval_payment_hours)


def submit_reservation(
    db: Session,
    user: User,
    requested_start: datetime,
    requested_end: datetime,
    purpose: str | None,
    notes: str | None,
) -> StudioReservation:
    if requested_end <= requested_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )
    if requested_start.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested start cannot be in the past",
        )

    reservation = StudioReservation(
        user_id=user.id,
        requested_start=requested_start,
        requested_end=requested_end,
        purpose=purpose,
        notes=notes,
        status=ReservationStatus.pending,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    if user.email:
        subject, plain, html = render_reservation_submitted_email(
            recipient_name=user.first_name,
            requested_start=requested_start,
            requested_end=requested_end,
        )
        send_email(user.email, subject, plain, html)

    return reservation


def approve_reservation(
    db: Session,
    reservation_id,
    approved_price_ghs: Decimal,
) -> StudioReservation:
    if approved_price_ghs <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved price must be positive",
        )

    reservation = db.get(StudioReservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != ReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is not pending approval",
        )

    deposit = get_reservation_deposit_ghs(db)
    balance = approved_price_ghs - deposit
    if balance < 0:
        balance = Decimal("0")

    reservation.status = ReservationStatus.approved
    reservation.approved_price_ghs = approved_price_ghs
    reservation.deposit_amount_ghs = deposit
    reservation.balance_due_ghs = balance
    reservation.approved_at = datetime.now(UTC)
    reservation.payment_deadline = _payment_deadline()
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    user = db.get(User, reservation.user_id)
    if user and user.email:
        subject, plain, html = render_reservation_approved_email(
            recipient_name=user.first_name,
            approved_price_ghs=approved_price_ghs,
            deposit_ghs=deposit,
            balance_due_ghs=balance,
            payment_deadline=reservation.payment_deadline,
        )
        send_email(user.email, subject, plain, html)

    return reservation


def reject_reservation(
    db: Session,
    reservation_id,
    rejection_reason: str | None,
) -> StudioReservation:
    reservation = db.get(StudioReservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != ReservationStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is not pending approval",
        )

    reservation.status = ReservationStatus.rejected
    reservation.rejection_reason = rejection_reason
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    user = db.get(User, reservation.user_id)
    if user and user.email:
        subject, plain, html = render_reservation_rejected_email(
            recipient_name=user.first_name,
            rejection_reason=rejection_reason,
        )
        send_email(user.email, subject, plain, html)

    return reservation


def checkout_reservation_deposit(db: Session, user: User, reservation_id) -> dict:
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email required for payment",
        )

    reservation = db.get(StudioReservation, reservation_id)
    if reservation is None or reservation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status != ReservationStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is not approved for payment",
        )
    if reservation.payment_deadline and reservation.payment_deadline.replace(tzinfo=UTC) < datetime.now(UTC):
        reservation.status = ReservationStatus.expired
        db.add(reservation)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment deadline has passed",
        )

    deposit = reservation.deposit_amount_ghs or get_reservation_deposit_ghs(db)
    reference = generate_reference()
    amount_pesewas = int(deposit * 100)

    reservation.status = ReservationStatus.payment_pending
    reservation.paystack_reference = reference
    db.add(reservation)
    db.flush()

    payment = Payment(
        user_id=user.id,
        reservation_id=reservation.id,
        reference=reference,
        amount_pesewas=amount_pesewas,
        currency="GHS",
        status=PaymentStatus.pending,
        purpose=PaymentPurpose.reservation_deposit,
        idempotency_key=reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(reservation)

    if settings.paystack_configured:
        paystack_data = initialize_transaction(
            email=user.email,
            amount_pesewas=amount_pesewas,
            reference=reference,
            metadata={
                "reservation_id": str(reservation.id),
                "user_id": str(user.id),
                "purpose": PaymentPurpose.reservation_deposit.value,
            },
        )
        authorization_url = paystack_data["authorization_url"]
    elif settings.debug:
        authorization_url = (
            f"{settings.frontend_url}/reservations/payment/callback?reference={reference}"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    return {
        "reservation_id": reservation.id,
        "authorization_url": authorization_url,
        "reference": reference,
        "public_key": settings.paystack_public_key or "",
        "amount_ghs": deposit,
        "balance_due_ghs": reservation.balance_due_ghs or Decimal("0"),
    }
