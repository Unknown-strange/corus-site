import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.booking import (
    Booking,
    BookingPaymentMethod,
    BookingSource,
    BookingStatus,
)
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.receipt import Receipt
from app.models.session_type import SessionType
from app.models.user import User
from app.schemas.walk_in_booking import WalkInPaymentMethod
from app.services.paystack import generate_reference, initialize_transaction
from app.services.payment_confirmation import confirm_walk_in_offline_payment
from app.services.slot_availability import get_session_deposit_ghs, slot_is_unavailable


def _split_full_name(full_name: str) -> tuple[str, str | None]:
    parts = full_name.strip().split()
    if not parts:
        return full_name.strip(), None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def _resolve_session_type_id(
    db: Session,
    session_type_id: uuid.UUID | None,
    package_name: str,
) -> uuid.UUID:
    if session_type_id is not None:
        session_type = db.get(SessionType, session_type_id)
        if session_type is None or not session_type.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session type not found")
        return session_type.id

    session_type = (
        db.query(SessionType)
        .filter(SessionType.is_active.is_(True), SessionType.name.ilike(package_name.strip()))
        .first()
    )
    if session_type is not None:
        return session_type.id

    fallback = (
        db.query(SessionType)
        .filter(SessionType.is_active.is_(True))
        .order_by(SessionType.created_at.asc())
        .first()
    )
    if fallback is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active session type available for walk-in booking",
        )
    return fallback.id


def _apply_customer_profile(
    db: Session,
    user: User,
    *,
    customer_full_name: str | None,
    customer_phone: str | None,
) -> tuple[str, str]:
    profile_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    display_name = (customer_full_name or profile_name or user.username or "").strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required",
        )

    phone = (customer_phone or user.phone_number or "").strip().replace(" ", "")
    if len(phone) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required",
        )

    if customer_full_name:
        first_name, last_name = _split_full_name(customer_full_name)
        user.first_name = first_name
        user.last_name = last_name
    if customer_phone:
        user.phone_number = phone
    db.add(user)
    db.flush()
    return display_name, phone


def _amounts_for_walk_in(
    db: Session,
    *,
    total_price: Decimal,
    payment_method: WalkInPaymentMethod,
    amount_paid_ghs: Decimal | None,
) -> tuple[Decimal, Decimal, Decimal]:
    if payment_method == WalkInPaymentMethod.offline:
        paid = amount_paid_ghs or Decimal("0")
        balance = total_price - paid
        if balance < 0:
            balance = Decimal("0")
        return paid, total_price, balance

    deposit = get_session_deposit_ghs(db)
    if deposit > total_price:
        deposit = total_price
    balance = total_price - deposit
    if balance < 0:
        balance = Decimal("0")
    return deposit, total_price, balance


def create_walk_in_booking(
    db: Session,
    *,
    user: User,
    customer_full_name: str | None,
    customer_phone: str | None,
    session_type_id: uuid.UUID | None,
    package_name: str,
    package_description: str | None,
    package_price_ghs: Decimal,
    package_duration_minutes: int,
    slot_id: uuid.UUID,
    pictures_count: int,
    picture_pickup_date,
    accepted_at: datetime | None,
    payment_method: WalkInPaymentMethod,
    amount_paid_ghs: Decimal | None,
) -> dict:
    if slot_is_unavailable(db, slot_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot is not available")

    display_name, _phone = _apply_customer_profile(
        db,
        user,
        customer_full_name=customer_full_name,
        customer_phone=customer_phone,
    )

    resolved_session_type_id = _resolve_session_type_id(db, session_type_id, package_name)
    deposit, total_price, balance_due = _amounts_for_walk_in(
        db,
        total_price=package_price_ghs,
        payment_method=payment_method,
        amount_paid_ghs=amount_paid_ghs,
    )

    accepted = accepted_at or datetime.now(UTC)
    if accepted.tzinfo is None:
        accepted = accepted.replace(tzinfo=UTC)

    reference = generate_reference()
    booking = Booking(
        user_id=user.id,
        slot_id=slot_id,
        session_type_id=resolved_session_type_id,
        booking_source=BookingSource.walk_in,
        payment_method=(
            BookingPaymentMethod.offline
            if payment_method == WalkInPaymentMethod.offline
            else BookingPaymentMethod.online
        ),
        customer_full_name=display_name,
        package_name=package_name.strip(),
        package_description=package_description,
        package_duration_minutes=package_duration_minutes,
        pictures_count=pictures_count,
        picture_pickup_date=picture_pickup_date,
        accepted_at=accepted,
        status=(
            BookingStatus.confirmed
            if payment_method == WalkInPaymentMethod.offline
            else BookingStatus.pending_payment
        ),
        deposit_amount_ghs=deposit,
        total_price_ghs=total_price,
        balance_due_ghs=balance_due,
        paystack_reference=reference,
        confirmed_at=datetime.now(UTC) if payment_method == WalkInPaymentMethod.offline else None,
    )
    db.add(booking)
    db.flush()

    if payment_method == WalkInPaymentMethod.offline:
        payment = Payment(
            user_id=user.id,
            booking_id=booking.id,
            reference=reference,
            amount_pesewas=int(deposit * 100),
            currency="GHS",
            status=PaymentStatus.success,
            purpose=PaymentPurpose.walk_in_offline,
            idempotency_key=reference,
            paystack_response={"method": "offline", "submitted_by": str(user.id)},
        )
        db.add(payment)
        db.commit()
        db.refresh(booking)

        confirm_walk_in_offline_payment(db, payment)
        receipt = db.query(Receipt).filter(Receipt.payment_id == payment.id).first()
        return {
            "booking_id": booking.id,
            "status": booking.status.value,
            "reference": reference,
            "amount_paid_ghs": deposit,
            "total_price_ghs": total_price,
            "balance_due_ghs": balance_due,
            "receipt_number": receipt.receipt_number if receipt else "",
            "message": "Walk-in booking submitted. Receipt sent to your email.",
        }

    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email required for online payment",
        )

    payment = Payment(
        user_id=user.id,
        booking_id=booking.id,
        reference=reference,
        amount_pesewas=int(deposit * 100),
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
            amount_pesewas=int(deposit * 100),
            reference=reference,
            metadata={
                "booking_id": str(booking.id),
                "user_id": str(user.id),
                "purpose": PaymentPurpose.session_deposit.value,
                "booking_source": BookingSource.walk_in.value,
            },
        )
        authorization_url = paystack_data["authorization_url"]
    elif settings.debug:
        authorization_url = f"{settings.frontend_url}/checkout/callback?reference={reference}"
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
        "total_price_ghs": total_price,
        "balance_due_ghs": balance_due,
    }


def list_walk_in_bookings_for_user(db: Session, user_id: uuid.UUID) -> list[Booking]:
    return (
        db.query(Booking)
        .options(
            joinedload(Booking.slot),
            joinedload(Booking.session_type),
            joinedload(Booking.user),
            joinedload(Booking.receipts),
        )
        .filter(
            Booking.user_id == user_id,
            Booking.booking_source == BookingSource.walk_in,
        )
        .order_by(Booking.created_at.desc())
        .all()
    )


def get_walk_in_booking_for_user(
    db: Session, booking_id: uuid.UUID, user_id: uuid.UUID
) -> Booking | None:
    return (
        db.query(Booking)
        .options(
            joinedload(Booking.slot),
            joinedload(Booking.session_type),
            joinedload(Booking.user),
            joinedload(Booking.receipts),
        )
        .filter(
            Booking.id == booking_id,
            Booking.user_id == user_id,
            Booking.booking_source == BookingSource.walk_in,
        )
        .first()
    )
