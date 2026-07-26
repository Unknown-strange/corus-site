from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.services.order_stock import restore_order_items_stock


def fail_order_payment(db: Session, payment: Payment, paystack_data: dict) -> None:
    payment.status = PaymentStatus.failed
    payment.paystack_response = paystack_data
    db.add(payment)

    if payment.order_id is None:
        db.commit()
        return

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == payment.order_id)
        .first()
    )
    if order is None or order.status != OrderStatus.pending_payment:
        db.commit()
        return

    restore_order_items_stock(db, order.items)
    order.status = OrderStatus.payment_failed
    db.add(order)
    db.commit()
