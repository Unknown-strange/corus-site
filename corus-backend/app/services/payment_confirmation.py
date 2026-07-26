import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.rental_request import RentalRequest, RentalStatus
from app.models.slot_hold import HoldStatus, SlotHold
from app.models.studio_reservation import ReservationStatus, StudioReservation
from app.models.user import User
from app.services.finance_service import sync_payment_to_ledger
from app.services.order_payment import fail_order_payment
from app.services.paystack import verify_transaction
from app.services.receipt_service import issue_receipt

logger = logging.getLogger(__name__)


@dataclass
class PaymentConfirmResult:
    purpose: PaymentPurpose
    booking: Booking | None = None
    rental: RentalRequest | None = None
    reservation: StudioReservation | None = None
    order: Order | None = None


def confirm_payment_success(db: Session, reference: str, paystack_data: dict) -> PaymentConfirmResult | None:
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    if payment is None:
        return None

    if payment.status == PaymentStatus.success:
        sync_payment_to_ledger(db, payment)
        db.commit()
        return _result_for_existing_payment(db, payment)

    if paystack_data.get("status") != "success":
        if payment.purpose == PaymentPurpose.order_payment:
            fail_order_payment(db, payment, paystack_data)
        else:
            payment.status = PaymentStatus.failed
            payment.paystack_response = paystack_data
            db.add(payment)
            db.commit()
        return None

    if payment.purpose == PaymentPurpose.session_deposit:
        return _confirm_session_deposit(db, payment, paystack_data)
    if payment.purpose == PaymentPurpose.rental_payment:
        return _confirm_rental_payment(db, payment, paystack_data)
    if payment.purpose == PaymentPurpose.reservation_deposit:
        return _confirm_reservation_deposit(db, payment, paystack_data)
    if payment.purpose == PaymentPurpose.order_payment:
        return _confirm_order_payment(db, payment, paystack_data)

    logger.warning("Unknown payment purpose for reference %s", reference)
    return None


def verify_and_confirm_payment(db: Session, reference: str) -> PaymentConfirmResult | None:
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    if payment is None:
        return None

    if payment.status == PaymentStatus.success:
        sync_payment_to_ledger(db, payment)
        db.commit()
        return _result_for_existing_payment(db, payment)

    if settings.paystack_configured:
        data = verify_transaction(reference)
        return confirm_payment_success(db, reference, data)

    if settings.debug:
        fake_data = {"status": "success", "reference": reference}
        return confirm_payment_success(db, reference, fake_data)

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Paystack is not configured",
    )


def _result_for_existing_payment(db: Session, payment: Payment) -> PaymentConfirmResult:
    if payment.purpose == PaymentPurpose.session_deposit:
        return PaymentConfirmResult(
            purpose=payment.purpose,
            booking=db.get(Booking, payment.booking_id),
        )
    if payment.purpose == PaymentPurpose.rental_payment:
        return PaymentConfirmResult(
            purpose=payment.purpose,
            rental=db.get(RentalRequest, payment.rental_request_id),
        )
    if payment.purpose == PaymentPurpose.reservation_deposit:
        return PaymentConfirmResult(
            purpose=payment.purpose,
            reservation=db.get(StudioReservation, payment.reservation_id),
        )
    if payment.purpose == PaymentPurpose.order_payment:
        return PaymentConfirmResult(
            purpose=payment.purpose,
            order=db.get(Order, payment.order_id),
        )
    return PaymentConfirmResult(purpose=payment.purpose)


def _confirm_session_deposit(
    db: Session, payment: Payment, paystack_data: dict
) -> PaymentConfirmResult | None:
    booking = db.get(Booking, payment.booking_id)
    if booking is None:
        return None

    payment.status = PaymentStatus.success
    payment.paystack_response = paystack_data
    booking.status = BookingStatus.confirmed
    booking.confirmed_at = datetime.now(UTC)
    db.add(payment)
    db.add(booking)

    if booking.hold_id:
        hold = db.get(SlotHold, booking.hold_id)
        if hold is not None:
            hold.status = HoldStatus.converted
            db.add(hold)

    db.commit()
    db.refresh(booking)
    sync_payment_to_ledger(db, payment)
    issue_receipt(db, payment, send_email=True)
    db.commit()

    return PaymentConfirmResult(purpose=PaymentPurpose.session_deposit, booking=booking)


def _confirm_rental_payment(
    db: Session, payment: Payment, paystack_data: dict
) -> PaymentConfirmResult | None:
    rental = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.id == payment.rental_request_id)
        .first()
    )
    if rental is None:
        return None

    equipment = rental.equipment
    if equipment is None or equipment.stock < 1:
        payment.status = PaymentStatus.failed
        payment.paystack_response = paystack_data
        db.add(payment)
        db.commit()
        return None

    payment.status = PaymentStatus.success
    payment.paystack_response = paystack_data
    rental.status = RentalStatus.active
    rental.paid_at = datetime.now(UTC)
    equipment.stock -= 1
    db.add(payment)
    db.add(rental)
    db.add(equipment)

    db.commit()
    db.refresh(rental)
    sync_payment_to_ledger(db, payment)
    issue_receipt(db, payment, send_email=True)
    db.commit()

    return PaymentConfirmResult(purpose=PaymentPurpose.rental_payment, rental=rental)


def _confirm_reservation_deposit(
    db: Session, payment: Payment, paystack_data: dict
) -> PaymentConfirmResult | None:
    reservation = db.get(StudioReservation, payment.reservation_id)
    if reservation is None:
        return None

    payment.status = PaymentStatus.success
    payment.paystack_response = paystack_data
    reservation.status = ReservationStatus.reserved
    db.add(payment)
    db.add(reservation)

    db.commit()
    db.refresh(reservation)
    sync_payment_to_ledger(db, payment)
    issue_receipt(db, payment, send_email=True)
    db.commit()

    return PaymentConfirmResult(purpose=PaymentPurpose.reservation_deposit, reservation=reservation)


def _confirm_order_payment(
    db: Session, payment: Payment, paystack_data: dict
) -> PaymentConfirmResult | None:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == payment.order_id)
        .first()
    )
    if order is None:
        return None

    if order.status == OrderStatus.pending:
        return PaymentConfirmResult(purpose=PaymentPurpose.order_payment, order=order)

    if order.status != OrderStatus.pending_payment:
        payment.status = PaymentStatus.failed
        payment.paystack_response = paystack_data
        db.add(payment)
        db.commit()
        return None

    payment.status = PaymentStatus.success
    payment.paystack_response = paystack_data
    order.status = OrderStatus.pending
    order.paid_at = datetime.now(UTC)
    db.add(payment)
    db.add(order)

    db.commit()
    db.refresh(order)
    sync_payment_to_ledger(db, payment)
    issue_receipt(db, payment, send_email=True, admin_copy=True)
    db.commit()

    return PaymentConfirmResult(purpose=PaymentPurpose.order_payment, order=order)
