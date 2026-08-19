from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.cart_item import CartItem
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.product import ProductForSale
from app.models.user import User
from app.services.cart import get_cart_with_items
from app.services.order_stock import calculate_line_total, decrement_product_stock
from app.services.paystack import generate_reference, initialize_transaction


def payment_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=settings.order_payment_minutes)


def checkout_order(db: Session, user: User) -> dict:
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email required for payment",
        )

    cart = get_cart_with_items(db, user)
    if not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    product_ids = [item.product_id for item in cart.items]
    products = (
        db.query(ProductForSale)
        .filter(ProductForSale.id.in_(product_ids))
        .with_for_update()
        .all()
    )
    product_map = {product.id: product for product in products}

    line_items: list[tuple[CartItem, ProductForSale, Decimal]] = []
    total_ghs = Decimal("0")

    for item in cart.items:
        product = product_map.get(item.product_id)
        if product is None or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product unavailable: {item.product_id}",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient stock for {product.name}",
            )
        line_total = calculate_line_total(product.price, item.quantity)
        line_items.append((item, product, line_total))
        total_ghs += line_total

    reference = generate_reference()
    order = Order(
        user_id=user.id,
        status=OrderStatus.pending_payment,
        total_ghs=total_ghs,
        paystack_reference=reference,
        payment_expires_at=payment_expires_at(),
    )
    db.add(order)
    db.flush()

    for cart_item, product, line_total in line_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                unit_price_ghs=product.price,
                quantity=cart_item.quantity,
                line_total_ghs=line_total,
            )
        )
        decrement_product_stock(db, product, cart_item.quantity)

    amount_pesewas = int(total_ghs * 100)
    payment = Payment(
        user_id=user.id,
        order_id=order.id,
        reference=reference,
        amount_pesewas=amount_pesewas,
        currency="GHS",
        status=PaymentStatus.pending,
        purpose=PaymentPurpose.order_payment,
        idempotency_key=reference,
    )
    db.add(payment)

    for item in list(cart.items):
        db.delete(item)
    cart.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(order)

    if settings.paystack_configured:
        paystack_data = initialize_transaction(
            email=user.email,
            amount_pesewas=amount_pesewas,
            reference=reference,
            metadata={
                "order_id": str(order.id),
                "user_id": str(user.id),
                "purpose": PaymentPurpose.order_payment.value,
            },
        )
        authorization_url = paystack_data["authorization_url"]
    elif settings.debug:
        authorization_url = f"{settings.frontend_url}/shop/payment/callback?reference={reference}"
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    return {
        "order_id": order.id,
        "authorization_url": authorization_url,
        "reference": reference,
        "public_key": settings.paystack_public_key or "",
        "amount_ghs": total_ghs,
    }
