import logging
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.session_type import SessionType

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.slot_hold import HoldStatus, SlotHold
from app.models.user import User
from app.services.paystack import generate_reference, initialize_transaction
from app.services.slot_availability import (
    get_session_deposit_ghs,
    hold_expires_at,
    slot_is_unavailable,
)

logger = logging.getLogger(__name__)


def create_hold(db: Session, user: User, slot_id: uuid.UUID, session_type_id: uuid.UUID) -> SlotHold:
    session_type = db.get(SessionType, session_type_id)
    if session_type is None or not session_type.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session type not found")

    if slot_is_unavailable(db, slot_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot is not available")

    existing = (
        db.query(SlotHold)
        .filter(
            SlotHold.user_id == user.id,
            SlotHold.status == HoldStatus.active,
            SlotHold.expires_at >= datetime.now(UTC),
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active slot hold",
        )

    hold = SlotHold(
        slot_id=slot_id,
        user_id=user.id,
        session_type_id=session_type_id,
        expires_at=hold_expires_at(),
        status=HoldStatus.active,
    )
    db.add(hold)
    db.commit()
    db.refresh(hold)
    return hold


def release_hold(db: Session, user: User, hold_id: uuid.UUID) -> None:
    hold = db.get(SlotHold, hold_id)
    if hold is None or hold.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hold not found")
    if hold.status != HoldStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hold is not active")

    hold.status = HoldStatus.released
    db.add(hold)
    db.commit()


def checkout_booking(
    db: Session,
    user: User,
    hold_id: uuid.UUID,
    *,
    pictures_count: int | None = None,
    picture_pickup_date: date | None = None,
    accepted_at: datetime | None = None,
    package_name: str | None = None,
    package_description: str | None = None,
    package_price_ghs: Decimal | None = None,
    package_duration_minutes: int | None = None,
) -> dict:
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email required for payment",
        )

    hold = (
        db.query(SlotHold)
        .options(joinedload(SlotHold.session_type), joinedload(SlotHold.slot))
        .filter(SlotHold.id == hold_id, SlotHold.user_id == user.id)
        .first()
    )
    if hold is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hold not found")
    if hold.status != HoldStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hold is not active")
    if hold.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        hold.status = HoldStatus.expired
        db.add(hold)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hold has expired")

    if slot_is_unavailable(db, hold.slot_id, exclude_hold_id=hold.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot is no longer available")

    deposit = get_session_deposit_ghs(db)
    session_type = hold.session_type
    total_price = package_price_ghs or session_type.price_ghs
    balance_due = total_price - deposit
    if balance_due < 0:
        balance_due = Decimal("0")

    accepted = accepted_at or datetime.now(UTC)
    if accepted.tzinfo is None:
        accepted = accepted.replace(tzinfo=UTC)

    reference = generate_reference()
    booking = Booking(
        user_id=user.id,
        slot_id=hold.slot_id,
        session_type_id=hold.session_type_id,
        hold_id=hold.id,
        status=BookingStatus.pending_payment,
        package_name=package_name or session_type.name,
        package_description=(
            package_description if package_description is not None else session_type.description
        ),
        package_duration_minutes=package_duration_minutes or session_type.duration_minutes,
        pictures_count=pictures_count,
        picture_pickup_date=picture_pickup_date,
        accepted_at=accepted,
        deposit_amount_ghs=deposit,
        total_price_ghs=total_price,
        balance_due_ghs=balance_due,
        paystack_reference=reference,
    )
    db.add(booking)
    db.flush()

    amount_pesewas = int(deposit * 100)
    payment = Payment(
        user_id=user.id,
        booking_id=booking.id,
        reference=reference,
        amount_pesewas=amount_pesewas,
        currency="GHS",
        status=PaymentStatus.pending,
        purpose=PaymentPurpose.session_deposit,
        idempotency_key=reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(booking)

    if settings.paystack_configured:
        paystack_data = initialize_transaction(
            email=user.email,
            amount_pesewas=amount_pesewas,
            reference=reference,
            metadata={
                "booking_id": str(booking.id),
                "user_id": str(user.id),
                "purpose": PaymentPurpose.session_deposit.value,
            },
        )
        authorization_url = paystack_data["authorization_url"]
    elif settings.debug:
        authorization_url = f"{settings.frontend_url}/booking/payment/callback?reference={reference}"
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    return {
        "booking_id": booking.id,
        "authorization_url": authorization_url,
        "reference": reference,
        "public_key": settings.paystack_public_key or "",
        "amount_ghs": deposit,
    }

