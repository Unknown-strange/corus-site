from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.admin_deps import OrdersManageUser, OrdersViewUser
from app.core.deps import DbSession
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.order import OrderAdminResponse, OrderItemResponse, OrderStatusUpdateRequest
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.services.audit_service import log_action
from app.services.order_fulfillment import update_order_status

router = APIRouter(tags=["admin-orders"])


def _to_admin_response(order: Order, user: User | None) -> OrderAdminResponse:
    return OrderAdminResponse(
        id=order.id,
        user_id=order.user_id,
        customer_email=user.email if user else None,
        customer_name=user.first_name if user else None,
        status=order.status.value,
        total_ghs=order.total_ghs,
        paystack_reference=order.paystack_reference,
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
    )


@router.get("/admin/orders", response_model=PaginatedResponse[OrderAdminResponse])
def list_orders_admin(
    _user: OrdersViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> PaginatedResponse[OrderAdminResponse]:
    query = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc())
    if status_filter:
        try:
            query = query.filter(Order.status == OrderStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if from_date:
        query = query.filter(Order.created_at >= from_date)
    if to_date:
        query = query.filter(Order.created_at <= to_date)

    total = query.count()
    orders = query.offset((page - 1) * limit).limit(limit).all()
    results = []
    for order in orders:
        user = db.get(User, order.user_id)
        results.append(_to_admin_response(order, user))
    return build_paginated_response(results, total=total, page=page, limit=limit)


@router.get("/admin/orders/{order_id}", response_model=OrderAdminResponse)
def get_order_admin(
    order_id: UUID,
    _user: OrdersViewUser,
    db: DbSession,
) -> OrderAdminResponse:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    user = db.get(User, order.user_id)
    return _to_admin_response(order, user)


@router.patch("/admin/orders/{order_id}/status", response_model=OrderAdminResponse)
def update_order_status_admin(
    order_id: UUID,
    payload: OrderStatusUpdateRequest,
    user: OrdersManageUser,
    db: DbSession,
) -> OrderAdminResponse:
    try:
        new_status = OrderStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    order_before = db.get(Order, order_id)
    previous_status = order_before.status.value if order_before else None

    order = update_order_status(db, order_id, new_status)
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order.id)
        .first()
    )
    log_action(
        db,
        actor=user,
        action="order.status_updated",
        resource_type="order",
        resource_id=str(order_id),
        metadata={"from": previous_status, "to": new_status.value},
    )
    db.commit()

    customer = db.get(User, order.user_id)
    return _to_admin_response(order, customer)
