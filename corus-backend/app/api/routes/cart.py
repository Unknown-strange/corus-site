from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, status

from app.core.deps import CustomerUser, DbSession
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.schemas.cart import (
    CartAddItemRequest,
    CartItemResponse,
    CartResponse,
    CartUpdateItemRequest,
)
from app.services.cart import (
    add_cart_item,
    clear_cart,
    get_cart_with_items,
    remove_cart_item,
    update_cart_item_quantity,
)
from app.services.order_stock import calculate_line_total

router = APIRouter(prefix="/cart", tags=["cart"])


def _to_cart_response(cart: Cart) -> CartResponse:
    items: list[CartItemResponse] = []
    total = Decimal("0")
    count = 0

    for item in cart.items:
        product = item.product
        if product is None:
            continue
        line_total = calculate_line_total(product.price, item.quantity)
        total += line_total
        count += item.quantity
        items.append(
            CartItemResponse(
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                unit_price_ghs=product.price,
                quantity=item.quantity,
                line_total_ghs=line_total,
                image_url=product.image_url,
                stock=product.stock,
            )
        )

    return CartResponse(
        id=cart.id,
        items=items,
        total_ghs=total,
        item_count=count,
        updated_at=cart.updated_at,
    )


@router.get("", response_model=CartResponse)
def get_cart(user: CustomerUser, db: DbSession) -> CartResponse:
    cart = get_cart_with_items(db, user)
    return _to_cart_response(cart)


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def add_item(payload: CartAddItemRequest, user: CustomerUser, db: DbSession) -> CartResponse:
    cart = add_cart_item(db, user, payload.product_id, payload.quantity)
    return _to_cart_response(cart)


@router.patch("/items/{product_id}", response_model=CartResponse)
def update_item(
    product_id: UUID,
    payload: CartUpdateItemRequest,
    user: CustomerUser,
    db: DbSession,
) -> CartResponse:
    cart = update_cart_item_quantity(db, user, product_id, payload.quantity)
    return _to_cart_response(cart)


@router.delete("/items/{product_id}", response_model=CartResponse)
def delete_item(product_id: UUID, user: CustomerUser, db: DbSession) -> CartResponse:
    cart = remove_cart_item(db, user, product_id)
    return _to_cart_response(cart)


@router.delete("", response_model=CartResponse)
def delete_cart(user: CustomerUser, db: DbSession) -> CartResponse:
    cart = clear_cart(db, user)
    return _to_cart_response(cart)
