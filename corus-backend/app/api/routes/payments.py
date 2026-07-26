from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import DbSession
from app.models.payment import PaymentPurpose
from app.schemas.payment import PaymentVerifyResponse
from app.services.payment_confirmation import verify_and_confirm_payment

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/verify/{reference}", response_model=PaymentVerifyResponse)
def verify_payment(reference: str, db: DbSession) -> PaymentVerifyResponse:
    if not settings.debug and not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    result = verify_and_confirm_payment(db, reference)
    if result is None:
        return PaymentVerifyResponse(
            status="failed",
            reference=reference,
            message="Payment not confirmed",
        )

    if result.purpose == PaymentPurpose.session_deposit and result.booking:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            booking_id=str(result.booking.id),
            message="Booking confirmed",
        )
    if result.purpose == PaymentPurpose.rental_payment and result.rental:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            rental_id=str(result.rental.id),
            message="Rental confirmed",
        )
    if result.purpose == PaymentPurpose.reservation_deposit and result.reservation:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            reservation_id=str(result.reservation.id),
            message="Studio reservation confirmed",
        )
    if result.purpose == PaymentPurpose.order_payment and result.order:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            order_id=str(result.order.id),
            message="Order confirmed",
        )

    return PaymentVerifyResponse(
        status="success",
        reference=reference,
        message="Payment confirmed",
    )
