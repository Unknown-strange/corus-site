from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.core.admin_deps import CustomersViewUser
from app.core.deps import DbSession
from app.models.booking import Booking
from app.models.order import Order
from app.models.session_type import SessionType
from app.models.user import User, UserRole
from app.schemas.admin_ops import (
    CustomerBookingSummary,
    CustomerDetailResponse,
    CustomerListItem,
    CustomerOrderSummary,
)
from app.schemas.pagination import PaginatedResponse, build_paginated_response

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])


def _customer_list_item(user: User) -> CustomerListItem:
    return CustomerListItem(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at,
    )


@router.get("", response_model=PaginatedResponse[CustomerListItem])
def list_customers_admin(
    _user: CustomersViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    search: str | None = Query(default=None),
) -> PaginatedResponse[CustomerListItem]:
    query = db.query(User).filter(User.role == UserRole.customer).order_by(User.created_at.desc())
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.email.ilike(term),
                User.first_name.ilike(term),
                User.last_name.ilike(term),
                User.username.ilike(term),
            )
        )

    total = query.count()
    customers = query.offset((page - 1) * limit).limit(limit).all()
    items = [_customer_list_item(c) for c in customers]
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer_admin(
    customer_id: UUID,
    _user: CustomersViewUser,
    db: DbSession,
) -> CustomerDetailResponse:
    customer = db.get(User, customer_id)
    if customer is None or customer.role != UserRole.customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    recent_orders = (
        db.query(Order)
        .filter(Order.user_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )
    recent_bookings = (
        db.query(Booking)
        .options(joinedload(Booking.session_type))
        .filter(Booking.user_id == customer.id)
        .order_by(Booking.created_at.desc())
        .limit(10)
        .all()
    )

    base = _customer_list_item(customer)
    return CustomerDetailResponse(
        **base.model_dump(),
        recent_orders=[
            CustomerOrderSummary(
                id=o.id,
                status=o.status.value,
                total_ghs=o.total_ghs,
                created_at=o.created_at,
            )
            for o in recent_orders
        ],
        recent_bookings=[
            CustomerBookingSummary(
                id=b.id,
                status=b.status.value,
                session_type_name=b.session_type.name if b.session_type else None,
                created_at=b.created_at,
            )
            for b in recent_bookings
        ],
    )
