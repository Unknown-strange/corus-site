from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderStatus

FULFILLMENT_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.pending: OrderStatus.processing,
    OrderStatus.processing: OrderStatus.in_route,
    OrderStatus.in_route: OrderStatus.delivered,
}


def update_order_status(db: Session, order_id: UUID, new_status: OrderStatus) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    expected_next = FULFILLMENT_TRANSITIONS.get(order.status)
    if expected_next != new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status.value} to {new_status.value}",
        )

    order.status = new_status
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
