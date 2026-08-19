from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import DbSession
from app.models.payment import Payment, PaymentPurpose
from app.schemas.payment import PaymentVerifyResponse
from app.services.payment_confirmation import verify_and_confirm_payment
from app.services.payment_redirect import callback_path_for_purpose

router = APIRouter(prefix="/payments", tags=["payments"])


def _callback_path(db: DbSession, reference: str, purpose: PaymentPurpose | None = None) -> str:
    if purpose is not None:
        return callback_path_for_purpose(purpose)
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    return callback_path_for_purpose(payment.purpose if payment else None)


@router.get("/verify/{reference}", response_model=PaymentVerifyResponse)
def verify_payment(reference: str, db: DbSession) -> PaymentVerifyResponse:
    if not settings.debug and not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    result = verify_and_confirm_payment(db, reference)
    if result is None:
        return PaymentVerifyResponse(
            status="failed",
            reference=reference,
            callback_path=_callback_path(db, reference),
            message="Payment not confirmed",
        )

    path = callback_path_for_purpose(result.purpose)

    if result.purpose == PaymentPurpose.session_deposit and result.booking:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            callback_path=path,
            booking_id=str(result.booking.id),
            message="Booking confirmed",
        )
    if result.purpose == PaymentPurpose.rental_payment and result.rental:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            callback_path=path,
            rental_id=str(result.rental.id),
            message="Rental confirmed",
        )
    if result.purpose == PaymentPurpose.reservation_deposit and result.reservation:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            callback_path=path,
            reservation_id=str(result.reservation.id),
            message="Studio reservation confirmed",
        )
    if result.purpose == PaymentPurpose.order_payment and result.order:
        return PaymentVerifyResponse(
            status="success",
            reference=reference,
            callback_path=path,
            order_id=str(result.order.id),
            message="Order confirmed",
        )

    return PaymentVerifyResponse(
        status="success",
        reference=reference,
        callback_path=path,
        message="Payment confirmed",
    )
