from decimal import Decimal

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import DbSession
from app.models.payment import Payment, PaymentPurpose
from app.models.receipt import Receipt
from app.schemas.payment import PaymentReceiptSummary, PaymentVerifyResponse
from app.services.payment_confirmation import PaymentConfirmResult, verify_and_confirm_payment
from app.services.payment_redirect import callback_path_for_purpose

router = APIRouter(prefix="/payments", tags=["payments"])


def _callback_path(db: DbSession, reference: str, purpose: PaymentPurpose | None = None) -> str:
    if purpose is not None:
        return callback_path_for_purpose(purpose)
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    return callback_path_for_purpose(payment.purpose if payment else None)


def _payment_amount_ghs(payment: Payment | None) -> Decimal | None:
    if payment is None:
        return None
    return Decimal(payment.amount_pesewas) / Decimal("100")


def _receipt_summary(db: DbSession, payment: Payment | None) -> PaymentReceiptSummary | None:
    if payment is None:
        return None
    receipt = db.query(Receipt).filter(Receipt.payment_id == payment.id).first()
    if receipt is None:
        return None
    return PaymentReceiptSummary(
        receipt_number=receipt.receipt_number,
        amount_ghs=receipt.amount_ghs,
        issued_at=receipt.issued_at,
    )


def _success_response(
    db: DbSession,
    reference: str,
    result: PaymentConfirmResult,
    *,
    message: str,
    booking_id: str | None = None,
    rental_id: str | None = None,
    reservation_id: str | None = None,
    order_id: str | None = None,
) -> PaymentVerifyResponse:
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    receipt = _receipt_summary(db, payment)
    amount_ghs = receipt.amount_ghs if receipt else _payment_amount_ghs(payment)

    return PaymentVerifyResponse(
        status="success",
        reference=reference,
        callback_path=callback_path_for_purpose(result.purpose),
        booking_id=booking_id,
        rental_id=rental_id,
        reservation_id=reservation_id,
        order_id=order_id,
        message=message,
        amount_ghs=amount_ghs,
        receipt_number=receipt.receipt_number if receipt else None,
        issued_at=receipt.issued_at if receipt else None,
        receipt=receipt,
    )


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

    if result.purpose == PaymentPurpose.session_deposit and result.booking:
        return _success_response(
            db,
            reference,
            result,
            message="Booking confirmed. Pay the remaining balance at the studio.",
            booking_id=str(result.booking.id),
        )
    if result.purpose == PaymentPurpose.rental_payment and result.rental:
        return _success_response(
            db,
            reference,
            result,
            message="Rental confirmed",
            rental_id=str(result.rental.id),
        )
    if result.purpose == PaymentPurpose.reservation_deposit and result.reservation:
        return _success_response(
            db,
            reference,
            result,
            message="Studio reservation confirmed",
            reservation_id=str(result.reservation.id),
        )
    if result.purpose == PaymentPurpose.order_payment and result.order:
        return _success_response(
            db,
            reference,
            result,
            message="Order confirmed",
            order_id=str(result.order.id),
        )
    if result.purpose == PaymentPurpose.walk_in_offline and result.booking:
        return _success_response(
            db,
            reference,
            result,
            message="Walk-in booking confirmed",
            booking_id=str(result.booking.id),
        )

    return _success_response(db, reference, result, message="Payment confirmed")
