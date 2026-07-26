from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.admin_deps import AdminOnlyUser, PaymentsViewUser
from app.core.deps import DbSession
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.user import User
from app.schemas.admin_ops import PaymentAdminDetailResponse, PaymentAdminListItem
from app.schemas.pagination import PaginatedResponse, build_paginated_response

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])


def _payment_to_list_item(payment: Payment, user: User | None) -> PaymentAdminListItem:
    receipt = payment.receipt
    return PaymentAdminListItem(
        id=payment.id,
        user_id=payment.user_id,
        customer_email=user.email if user else None,
        customer_name=user.first_name if user else None,
        reference=payment.reference,
        amount_ghs=Decimal(payment.amount_pesewas) / Decimal(100),
        currency=payment.currency,
        status=payment.status.value,
        purpose=payment.purpose.value,
        receipt_id=receipt.id if receipt else None,
        receipt_number=receipt.receipt_number if receipt else None,
        created_at=payment.created_at,
    )


@router.get("", response_model=PaginatedResponse[PaymentAdminListItem])
def list_payments_admin(
    _user: PaymentsViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    purpose: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: UUID | None = Query(default=None),
    reference: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> PaginatedResponse[PaymentAdminListItem]:
    query = db.query(Payment).options(joinedload(Payment.receipt)).order_by(Payment.created_at.desc())

    if purpose:
        try:
            query = query.filter(Payment.purpose == PaymentPurpose(purpose))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid purpose")
    if status_filter:
        try:
            query = query.filter(Payment.status == PaymentStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if user_id:
        query = query.filter(Payment.user_id == user_id)
    if reference:
        query = query.filter(Payment.reference.ilike(f"%{reference.strip()}%"))
    if from_date:
        query = query.filter(Payment.created_at >= from_date)
    if to_date:
        query = query.filter(Payment.created_at <= to_date)

    total = query.count()
    payments = query.offset((page - 1) * limit).limit(limit).all()
    items = []
    for payment in payments:
        user = db.get(User, payment.user_id)
        items.append(_payment_to_list_item(payment, user))
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.get("/{payment_id}", response_model=PaymentAdminDetailResponse)
def get_payment_admin(
    payment_id: UUID,
    _admin: AdminOnlyUser,
    db: DbSession,
) -> PaymentAdminDetailResponse:
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.receipt))
        .filter(Payment.id == payment_id)
        .first()
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    user = db.get(User, payment.user_id)
    base = _payment_to_list_item(payment, user)
    return PaymentAdminDetailResponse(
        **base.model_dump(),
        booking_id=payment.booking_id,
        rental_request_id=payment.rental_request_id,
        reservation_id=payment.reservation_id,
        order_id=payment.order_id,
        paystack_response=payment.paystack_response,
        updated_at=payment.updated_at,
    )
