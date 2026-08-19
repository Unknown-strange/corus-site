from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import ProductForSale
from app.models.user import User


def get_or_create_cart(db: Session, user: User) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if cart is None:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def get_cart_with_items(db: Session, user: User) -> Cart:
    cart = (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.product))
        .filter(Cart.user_id == user.id)
        .first()
    )
    if cart is None:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _validate_product_for_cart(db: Session, product_id: UUID, quantity: int) -> ProductForSale:
    if quantity < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be at least 1")

    product = db.get(ProductForSale, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.stock < quantity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")
    return product


def add_cart_item(db: Session, user: User, product_id: UUID, quantity: int) -> Cart:
    product = _validate_product_for_cart(db, product_id, quantity)
    cart = get_or_create_cart(db, user)

    existing = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
        .first()
    )
    new_quantity = quantity if existing is None else existing.quantity + quantity
    if product.stock < new_quantity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")

    if existing is None:
        db.add(CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity))
    else:
        existing.quantity = new_quantity
        existing.updated_at = datetime.now(UTC)
        db.add(existing)

    cart.updated_at = datetime.now(UTC)
    db.add(cart)
    db.commit()
    return get_cart_with_items(db, user)


def update_cart_item_quantity(db: Session, user: User, product_id: UUID, quantity: int) -> Cart:
    cart = get_or_create_cart(db, user)
    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    if quantity <= 0:
        db.delete(item)
    else:
        product = _validate_product_for_cart(db, product_id, quantity)
        if product.stock < quantity:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")
        item.quantity = quantity
        item.updated_at = datetime.now(UTC)
        db.add(item)

    cart.updated_at = datetime.now(UTC)
    db.add(cart)
    db.commit()
    return get_cart_with_items(db, user)


def remove_cart_item(db: Session, user: User, product_id: UUID) -> Cart:
    return update_cart_item_quantity(db, user, product_id, 0)


def clear_cart_items(cart: Cart) -> None:
    cart.items.clear()


def clear_cart(db: Session, user: User) -> Cart:
    cart = get_cart_with_items(db, user)
    clear_cart_items(cart)
    cart.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(cart)
    return cart
