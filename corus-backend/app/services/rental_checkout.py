from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.equipment_for_rent import EquipmentForRent
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.rental_request import RentalRequest, RentalStatus
from app.models.user import User
from app.services.paystack import generate_reference, initialize_transaction
from app.services.rental_pricing import calculate_rental_price


def _validate_rental_dates(start_date: date, end_date: date) -> None:
    if end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )
    today = datetime.now(UTC).date()
    if start_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date cannot be in the past",
        )


def checkout_rental(
    db: Session,
    user: User,
    equipment_id,
    start_date: date,
    end_date: date,
) -> dict:
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email required for payment",
        )

    _validate_rental_dates(start_date, end_date)

    equipment = db.get(EquipmentForRent, equipment_id)
    if equipment is None or not equipment.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    if equipment.stock < 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Equipment out of stock")

    rental_days, total_price = calculate_rental_price(
        equipment.daily_rate_ghs, start_date, end_date
    )
    reference = generate_reference()

    rental = RentalRequest(
        user_id=user.id,
        equipment_id=equipment.id,
        start_date=start_date,
        end_date=end_date,
        rental_days=rental_days,
        total_price_ghs=total_price,
        status=RentalStatus.pending_payment,
        paystack_reference=reference,
    )
    db.add(rental)
    db.flush()

    amount_pesewas = int(total_price * 100)
    payment = Payment(
        user_id=user.id,
        rental_request_id=rental.id,
        reference=reference,
        amount_pesewas=amount_pesewas,
        currency="GHS",
        status=PaymentStatus.pending,
        purpose=PaymentPurpose.rental_payment,
        idempotency_key=reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(rental)

    if settings.paystack_configured:
        paystack_data = initialize_transaction(
            email=user.email,
            amount_pesewas=amount_pesewas,
            reference=reference,
            metadata={
                "rental_request_id": str(rental.id),
                "user_id": str(user.id),
                "purpose": PaymentPurpose.rental_payment.value,
            },
        )
        authorization_url = paystack_data["authorization_url"]
    elif settings.debug:
        authorization_url = f"{settings.frontend_url}/rentals/payment/callback?reference={reference}"
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    return {
        "rental_id": rental.id,
        "authorization_url": authorization_url,
        "reference": reference,
        "public_key": settings.paystack_public_key or "",
        "amount_ghs": total_price,
        "rental_days": rental_days,
        "daily_rate_ghs": equipment.daily_rate_ghs,
    }


def mark_rental_returned(db: Session, rental_id) -> RentalRequest:
    rental = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.id == rental_id)
        .first()
    )
    if rental is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.status not in (RentalStatus.paid, RentalStatus.active):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rental cannot be marked returned",
        )

    rental.status = RentalStatus.returned
    rental.returned_at = datetime.now(UTC)
    if rental.equipment is not None:
        rental.equipment.stock += 1
        db.add(rental.equipment)
    db.add(rental)
    db.commit()
    db.refresh(rental)
    return rental
