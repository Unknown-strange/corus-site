"""Unified receipt creation, rendering, and delivery."""

import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models.booking import Booking
from app.models.order import Order
from app.models.payment import Payment, PaymentPurpose
from app.models.receipt import Receipt, ReceiptTypeEnum
from app.models.rental_request import RentalRequest
from app.models.session_type import SessionType
from app.models.studio_reservation import StudioReservation
from app.models.studio_slot import StudioSlot
from app.models.user import User
from app.services.notification_service import dispatch_email
from app.services.receipt_pdf import receipt_document_to_pdf
from app.services.receipt_templates import (
    DEFAULT_FOOTER,
    ReceiptDocument,
    ReceiptLineItem,
    ReceiptType,
    render_receipt_email,
    render_receipt_pdf_html,
    render_receipt_plain,
)

logger = logging.getLogger(__name__)

PURPOSE_TO_RECEIPT_TYPE = {
    PaymentPurpose.session_deposit: ReceiptType.session_deposit,
    PaymentPurpose.order_payment: ReceiptType.order_payment,
    PaymentPurpose.rental_payment: ReceiptType.rental_payment,
    PaymentPurpose.reservation_deposit: ReceiptType.reservation_deposit,
}


def generate_receipt_number() -> str:
    return f"RCP-{datetime.now(UTC).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def document_from_summary(summary: dict) -> ReceiptDocument:
    line_items = [
        ReceiptLineItem(
            description=item["description"],
            quantity=item.get("quantity", 1),
            unit_price_ghs=Decimal(str(item["unit_price_ghs"])) if item.get("unit_price_ghs") is not None else None,
            line_total_ghs=Decimal(str(item["line_total_ghs"])) if item.get("line_total_ghs") is not None else None,
            detail=item.get("detail"),
        )
        for item in summary.get("line_items", [])
    ]
    return ReceiptDocument(
        receipt_number=summary["receipt_number"],
        receipt_type=ReceiptType(summary["receipt_type"]),
        issued_at=datetime.fromisoformat(summary["issued_at"]),
        customer_name=summary.get("customer_name"),
        customer_email=summary.get("customer_email"),
        line_items=line_items,
        amount_paid_ghs=Decimal(str(summary["amount_paid_ghs"])),
        total_price_ghs=Decimal(str(summary["total_price_ghs"])) if summary.get("total_price_ghs") is not None else None,
        balance_due_ghs=Decimal(str(summary["balance_due_ghs"])) if summary.get("balance_due_ghs") is not None else None,
        payment_reference=summary.get("payment_reference"),
        footer_note=summary.get("footer_note", DEFAULT_FOOTER),
    )


def document_to_summary(doc: ReceiptDocument) -> dict:
    return {
        "receipt_number": doc.receipt_number,
        "receipt_type": doc.receipt_type.value,
        "issued_at": doc.issued_at.isoformat(),
        "customer_name": doc.customer_name,
        "customer_email": doc.customer_email,
        "line_items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price_ghs": str(item.unit_price_ghs) if item.unit_price_ghs is not None else None,
                "line_total_ghs": str(item.line_total_ghs) if item.line_total_ghs is not None else None,
                "detail": item.detail,
            }
            for item in doc.line_items
        ],
        "amount_paid_ghs": str(doc.amount_paid_ghs),
        "total_price_ghs": str(doc.total_price_ghs) if doc.total_price_ghs is not None else None,
        "balance_due_ghs": str(doc.balance_due_ghs) if doc.balance_due_ghs is not None else None,
        "payment_reference": doc.payment_reference,
        "footer_note": doc.footer_note,
    }


def build_document_from_payment(db: Session, payment: Payment, receipt_number: str) -> ReceiptDocument | None:
    user = db.get(User, payment.user_id)
    receipt_type = PURPOSE_TO_RECEIPT_TYPE.get(payment.purpose)
    if receipt_type is None:
        return None

    base = {
        "receipt_number": receipt_number,
        "receipt_type": receipt_type,
        "issued_at": datetime.now(UTC),
        "customer_name": user.first_name if user else None,
        "customer_email": user.email if user else None,
        "payment_reference": payment.reference,
    }

    if payment.purpose == PaymentPurpose.session_deposit and payment.booking_id:
        booking = db.get(Booking, payment.booking_id)
        session_type = db.get(SessionType, booking.session_type_id) if booking else None
        slot = db.get(StudioSlot, booking.slot_id) if booking else None
        if not booking or not session_type:
            return None
        slot_detail = ""
        if slot:
            slot_detail = f"{slot.starts_at.strftime('%d %b %Y %H:%M')} – {slot.ends_at.strftime('%H:%M UTC')}"
        return ReceiptDocument(
            **base,
            line_items=[
                ReceiptLineItem(
                    description=session_type.name,
                    detail=slot_detail or None,
                    line_total_ghs=booking.total_price_ghs,
                ),
                ReceiptLineItem(
                    description="Session deposit (paid online)",
                    line_total_ghs=booking.deposit_amount_ghs,
                ),
            ],
            amount_paid_ghs=booking.deposit_amount_ghs,
            total_price_ghs=booking.total_price_ghs,
            balance_due_ghs=booking.balance_due_ghs,
            footer_note="Your session is confirmed. Pay the remaining balance at the studio.",
        )

    if payment.purpose == PaymentPurpose.order_payment and payment.order_id:
        order = (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(Order.id == payment.order_id)
            .first()
        )
        if not order:
            return None
        return ReceiptDocument(
            **base,
            line_items=[
                ReceiptLineItem(
                    description=item.product_name,
                    quantity=item.quantity,
                    unit_price_ghs=item.unit_price_ghs,
                    line_total_ghs=item.line_total_ghs,
                )
                for item in order.items
            ],
            amount_paid_ghs=order.total_ghs,
            total_price_ghs=order.total_ghs,
            footer_note="Your order is confirmed. Pick up your items at the studio when ready.",
        )

    if payment.purpose == PaymentPurpose.rental_payment and payment.rental_request_id:
        rental = (
            db.query(RentalRequest)
            .options(joinedload(RentalRequest.equipment))
            .filter(RentalRequest.id == payment.rental_request_id)
            .first()
        )
        if not rental or not rental.equipment:
            return None
        return ReceiptDocument(
            **base,
            line_items=[
                ReceiptLineItem(
                    description=rental.equipment.name,
                    quantity=rental.rental_days,
                    detail=f"{rental.start_date} to {rental.end_date} · GHS {rental.equipment.daily_rate_ghs}/day",
                    unit_price_ghs=rental.equipment.daily_rate_ghs,
                    line_total_ghs=rental.total_price_ghs,
                ),
            ],
            amount_paid_ghs=rental.total_price_ghs,
            total_price_ghs=rental.total_price_ghs,
            footer_note="Your rental is confirmed. Return equipment by the end date.",
        )

    if payment.purpose == PaymentPurpose.reservation_deposit and payment.reservation_id:
        reservation = db.get(StudioReservation, payment.reservation_id)
        if not reservation:
            return None
        period = (
            f"{reservation.requested_start.strftime('%d %b %Y %H:%M')} – "
            f"{reservation.requested_end.strftime('%d %b %Y %H:%M UTC')}"
        )
        return ReceiptDocument(
            **base,
            line_items=[
                ReceiptLineItem(
                    description="Studio reservation",
                    detail=period + (f" · {reservation.purpose}" if reservation.purpose else ""),
                    line_total_ghs=reservation.approved_price_ghs,
                ),
                ReceiptLineItem(
                    description="Reservation deposit (paid online)",
                    line_total_ghs=reservation.deposit_amount_ghs or Decimal("0"),
                ),
            ],
            amount_paid_ghs=reservation.deposit_amount_ghs or Decimal("0"),
            total_price_ghs=reservation.approved_price_ghs,
            balance_due_ghs=reservation.balance_due_ghs,
            footer_note="Your studio reservation is confirmed. Pay the remaining balance at the studio.",
        )

    return None


def issue_receipt(
    db: Session,
    payment: Payment,
    *,
    send_email: bool = True,
    force_send: bool = False,
    admin_copy: bool = True,
) -> Receipt | None:
    existing = db.query(Receipt).filter(Receipt.payment_id == payment.id).first()
    if existing is not None and existing.summary_json:
        if send_email:
            _send_receipt_email(db, existing, force_send=force_send, admin_copy=admin_copy)
        return existing
    receipt_number = generate_receipt_number()
    document = build_document_from_payment(db, payment, receipt_number)
    if document is None:
        logger.warning("Could not build receipt document for payment %s", payment.id)
        return None

    summary = document_to_summary(document)
    receipt_type_enum = ReceiptTypeEnum(document.receipt_type.value)

    fk_kwargs = {
        "booking_id": payment.booking_id,
        "order_id": payment.order_id,
        "rental_request_id": payment.rental_request_id,
        "reservation_id": payment.reservation_id,
    }

    if existing:
        existing.receipt_type = receipt_type_enum
        existing.summary_json = summary
        existing.amount_ghs = document.amount_paid_ghs
        receipt = existing
    else:
        receipt = Receipt(
            payment_id=payment.id,
            user_id=payment.user_id,
            receipt_number=receipt_number,
            receipt_type=receipt_type_enum,
            amount_ghs=document.amount_paid_ghs,
            summary_json=summary,
            **fk_kwargs,
        )
        db.add(receipt)

    db.flush()

    if send_email:
        _send_receipt_email(db, receipt, force_send=force_send, admin_copy=admin_copy)

    return receipt


def _send_receipt_email(
    db: Session,
    receipt: Receipt,
    *,
    force_send: bool = False,
    admin_copy: bool = True,
) -> None:
    if not receipt.summary_json:
        return

    doc = document_from_summary(receipt.summary_json)
    subject, plain, html = render_receipt_email(doc)
    pdf_bytes = receipt_document_to_pdf(doc)
    pdf_attachment = (f"{receipt.receipt_number}.pdf", pdf_bytes) if pdf_bytes else None

    user = db.get(User, receipt.user_id)
    if user and user.email:
        dispatch_email(
            db,
            to_email=user.email,
            subject=subject,
            plain_text=plain,
            html=html,
            event_type="receipt_ready",
            user_id=receipt.user_id,
            reference_type="receipt",
            reference_id=receipt.id,
            force_send=force_send,
            pdf_attachment=pdf_attachment,
            send_admin_copy=admin_copy,
        )
    else:
        db.commit()


def render_receipt_pdf_bytes(receipt: Receipt) -> bytes | None:
    if not receipt.summary_json:
        return None
    doc = document_from_summary(receipt.summary_json)
    return receipt_document_to_pdf(doc)


def render_receipt_detail(receipt: Receipt) -> dict:
    if receipt.summary_json:
        doc = document_from_summary(receipt.summary_json)
        return {
            "html": render_receipt_pdf_html(doc),
            "plain": render_receipt_plain(doc),
            "document": document_to_summary(doc),
        }
    return {}
