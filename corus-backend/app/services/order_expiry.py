from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderStatus
from app.services.order_stock import restore_order_items_stock


def expire_unpaid_orders(db: Session) -> int:
    now = datetime.now(UTC)
    stale = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(
            Order.status == OrderStatus.pending_payment,
            Order.payment_expires_at.isnot(None),
            Order.payment_expires_at < now,
        )
        .all()
    )

    count = 0
    for order in stale:
        restore_order_items_stock(db, order.items)
        order.status = OrderStatus.cancelled
        db.add(order)
        count += 1

    if count:
        db.commit()
    return count
