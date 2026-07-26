from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.order_item import OrderItem
from app.models.product import ProductForSale
from app.services.stock_alerts import check_stock_crossing_alert


def decrement_product_stock(
    db: Session,
    product: ProductForSale,
    quantity: int,
) -> None:
    previous_stock = product.stock
    product.stock -= quantity
    db.add(product)
    check_stock_crossing_alert(db, product, previous_stock)


def restore_product_stock(
    db: Session,
    product: ProductForSale,
    quantity: int,
) -> None:
    previous_stock = product.stock
    product.stock += quantity
    db.add(product)
    check_stock_crossing_alert(db, product, previous_stock)


def restore_order_items_stock(db: Session, order_items: list[OrderItem]) -> None:
    for item in order_items:
        product = db.get(ProductForSale, item.product_id)
        if product is not None:
            restore_product_stock(db, product, item.quantity)


def calculate_line_total(unit_price: Decimal, quantity: int) -> Decimal:
    return unit_price * quantity
