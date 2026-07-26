from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import joinedload

from app.core.deps import CustomerUser, DbSession
from app.models.order import Order
from app.models.receipt import Receipt
from app.schemas.order import (
    OrderCheckoutResponse,
    OrderDetailResponse,
    OrderItemResponse,
    ReceiptSummary,
)
from app.services.order_checkout import checkout_order

router = APIRouter(prefix="/orders", tags=["orders"])


def _to_order_detail(order: Order, receipt: Receipt | None = None) -> OrderDetailResponse:
    return OrderDetailResponse(
        id=order.id,
        status=order.status.value,
        total_ghs=order.total_ghs,
        paystack_reference=order.paystack_reference,
        payment_expires_at=order.payment_expires_at,
        paid_at=order.paid_at,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemResponse(
                product_id=item.product_id,
                product_name=item.product_name,
                unit_price_ghs=item.unit_price_ghs,
                quantity=item.quantity,
                line_total_ghs=item.line_total_ghs,
            )
            for item in order.items
        ],
        receipt=ReceiptSummary.model_validate(receipt) if receipt else None,
    )


@router.post("/checkout", response_model=OrderCheckoutResponse)
def order_checkout(user: CustomerUser, db: DbSession) -> OrderCheckoutResponse:
    result = checkout_order(db, user)
    return OrderCheckoutResponse(**result)


@router.get("/me", response_model=list[OrderDetailResponse])
def my_orders(user: CustomerUser, db: DbSession) -> list[OrderDetailResponse]:
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_to_order_detail(order) for order in orders]


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order(order_id: UUID, user: CustomerUser, db: DbSession) -> OrderDetailResponse:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    receipt = db.query(Receipt).filter(Receipt.order_id == order.id).first()
    return _to_order_detail(order, receipt)
