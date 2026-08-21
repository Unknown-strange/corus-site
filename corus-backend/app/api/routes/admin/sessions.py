from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import joinedload

from app.core.admin_deps import BookingsViewUser, SessionsManageUser
from app.core.deps import DbSession
from app.models.booking import Booking, BookingStatus
from app.models.booking_settings import BookingSettings
from app.models.session_type import SessionType
from app.models.studio_slot import StudioSlot
from app.schemas.admin_booking import AdminBookingResponse
from app.schemas.booking import BookingSettingsResponse, BookingSettingsUpdateRequest
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.schemas.walk_in_booking import (
    WalkInBookingCreateRequest,
    WalkInBookingCreateResponse,
    WalkInBookingDetailResponse,
)
from app.schemas.session import (
    SessionTypeAdminResponse,
    SessionTypeCreateRequest,
    SessionTypeUpdateRequest,
    SlotBlockRequest,
    StudioSlotAdminResponse,
    StudioSlotCreateRequest,
)
from app.services.audit_service import log_action
from app.services.slot_availability import get_booking_settings
from app.services.walk_in_booking import create_walk_in_booking, get_walk_in_booking_detail
from app.utils.unique_slug import unique_slug

router = APIRouter(tags=["admin-sessions"])


@router.post("/admin/session-types", response_model=SessionTypeAdminResponse, status_code=status.HTTP_201_CREATED)
def create_session_type(payload: SessionTypeCreateRequest, _user: SessionsManageUser, db: DbSession) -> SessionType:
    session_type = SessionType(
        name=payload.name.strip(),
        slug=unique_slug(db, SessionType, payload.slug or payload.name),
        description=payload.description,
        price_ghs=payload.price_ghs,
        duration_minutes=payload.duration_minutes,
        is_active=payload.is_active,
    )
    db.add(session_type)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    db.refresh(session_type)
    return session_type


@router.get("/admin/session-types", response_model=list[SessionTypeAdminResponse])
def list_session_types_admin(_user: SessionsManageUser, db: DbSession) -> list[SessionType]:
    return db.query(SessionType).order_by(SessionType.name.asc()).all()


@router.patch("/admin/session-types/{type_id}", response_model=SessionTypeAdminResponse)
def update_session_type(
    type_id: UUID,
    payload: SessionTypeUpdateRequest,
    _user: SessionsManageUser,
    db: DbSession,
) -> SessionType:
    session_type = db.get(SessionType, type_id)
    if session_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session type not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        session_type.name = data["name"].strip()
    if "slug" in data and data["slug"] is not None:
        session_type.slug = unique_slug(db, SessionType, data["slug"], exclude_id=session_type.id)
    if "description" in data:
        session_type.description = data["description"]
    if "price_ghs" in data and data["price_ghs"] is not None:
        session_type.price_ghs = data["price_ghs"]
    if "duration_minutes" in data and data["duration_minutes"] is not None:
        session_type.duration_minutes = data["duration_minutes"]
    if "is_active" in data and data["is_active"] is not None:
        session_type.is_active = data["is_active"]

    db.add(session_type)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")
    db.refresh(session_type)
    return session_type


@router.delete("/admin/session-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_type(type_id: UUID, _user: SessionsManageUser, db: DbSession) -> None:
    session_type = db.get(SessionType, type_id)
    if session_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session type not found")
    session_type.is_active = False
    db.add(session_type)
    db.commit()


@router.post("/admin/studio-slots", response_model=StudioSlotAdminResponse, status_code=status.HTTP_201_CREATED)
def create_studio_slot(
    payload: StudioSlotCreateRequest,
    user: SessionsManageUser,
    db: DbSession,
) -> StudioSlot:
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be after starts_at")

    slot = StudioSlot(
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        created_by_id=user.id,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.get("/admin/studio-slots", response_model=list[StudioSlotAdminResponse])
def list_studio_slots(
    _user: SessionsManageUser,
    db: DbSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[StudioSlot]:
    query = db.query(StudioSlot)
    if from_date is not None:
        query = query.filter(StudioSlot.starts_at >= from_date)
    if to_date is not None:
        query = query.filter(StudioSlot.starts_at <= to_date)
    return query.order_by(StudioSlot.starts_at.asc()).all()


@router.patch("/admin/studio-slots/{slot_id}/block", response_model=StudioSlotAdminResponse)
def block_studio_slot(
    slot_id: UUID,
    payload: SlotBlockRequest,
    _user: SessionsManageUser,
    db: DbSession,
) -> StudioSlot:
    slot = db.get(StudioSlot, slot_id)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")
    slot.is_blocked = payload.is_blocked
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.get("/admin/bookings", response_model=PaginatedResponse[AdminBookingResponse])
def list_all_bookings(
    _user: BookingsViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    booking_date: datetime | None = Query(default=None, description="Filter by slot start date (UTC)"),
) -> PaginatedResponse[AdminBookingResponse]:
    query = (
        db.query(Booking)
        .options(joinedload(Booking.session_type), joinedload(Booking.slot))
        .order_by(Booking.created_at.desc())
    )
    if status_filter:
        try:
            query = query.filter(Booking.status == BookingStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if booking_date:
        query = query.join(StudioSlot).filter(
            StudioSlot.starts_at >= booking_date.replace(hour=0, minute=0, second=0, microsecond=0),
            StudioSlot.starts_at < booking_date.replace(hour=23, minute=59, second=59, microsecond=999999),
        )

    total = query.count()
    bookings = query.offset((page - 1) * limit).limit(limit).all()
    items = [
        AdminBookingResponse(
            id=b.id,
            user_id=b.user_id,
            status=b.status.value,
            booking_source=b.booking_source.value,
            payment_method=b.payment_method.value if b.payment_method else None,
            deposit_amount_ghs=b.deposit_amount_ghs,
            total_price_ghs=b.total_price_ghs,
            balance_due_ghs=b.balance_due_ghs,
            session_type_name=b.session_type.name,
            package_name=b.package_name,
            pictures_count=b.pictures_count,
            picture_pickup_date=b.picture_pickup_date,
            slot_starts_at=b.slot.starts_at,
            slot_ends_at=b.slot.ends_at,
            confirmed_at=b.confirmed_at,
            created_at=b.created_at,
        )
        for b in bookings
    ]
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.get("/admin/booking-settings", response_model=BookingSettingsResponse)
def get_booking_settings_admin(_user: SessionsManageUser, db: DbSession) -> BookingSettings:
    return get_booking_settings(db)


@router.patch("/admin/booking-settings", response_model=BookingSettingsResponse)
def update_booking_settings(
    payload: BookingSettingsUpdateRequest,
    user: SessionsManageUser,
    db: DbSession,
) -> BookingSettings:
    if payload.session_deposit_ghs is not None and payload.session_deposit_ghs <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session deposit must be positive")
    if payload.reservation_deposit_ghs is not None and payload.reservation_deposit_ghs <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation deposit must be positive",
        )
    if payload.session_deposit_ghs is None and payload.reservation_deposit_ghs is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No settings to update")

    settings_row = get_booking_settings(db)
    previous = {
        "session_deposit_ghs": settings_row.session_deposit_ghs,
        "reservation_deposit_ghs": settings_row.reservation_deposit_ghs,
    }
    if payload.session_deposit_ghs is not None:
        settings_row.session_deposit_ghs = payload.session_deposit_ghs
    if payload.reservation_deposit_ghs is not None:
        settings_row.reservation_deposit_ghs = payload.reservation_deposit_ghs
    db.add(settings_row)
    log_action(
        db,
        actor=user,
        action="booking_settings.updated",
        resource_type="booking_settings",
        resource_id=str(settings_row.id),
        metadata={"previous": previous, "updated": payload.model_dump(exclude_unset=True)},
    )
    db.commit()
    db.refresh(settings_row)
    return settings_row


def _walk_in_detail(booking: Booking) -> WalkInBookingDetailResponse:
    receipt = booking.receipts[0] if booking.receipts else None
    return WalkInBookingDetailResponse(
        id=booking.id,
        status=booking.status.value,
        booking_source=booking.booking_source.value,
        payment_method=booking.payment_method.value if booking.payment_method else None,
        customer_full_name=booking.customer_full_name,
        customer_email=booking.user.email if booking.user else None,
        customer_phone=booking.user.phone_number if booking.user else None,
        package_name=booking.display_package_name,
        package_description=booking.package_description,
        package_price_ghs=booking.total_price_ghs,
        package_duration_minutes=booking.package_duration_minutes,
        pictures_count=booking.pictures_count,
        picture_pickup_date=booking.picture_pickup_date,
        accepted_at=booking.accepted_at,
        deposit_amount_ghs=booking.deposit_amount_ghs,
        total_price_ghs=booking.total_price_ghs,
        balance_due_ghs=booking.balance_due_ghs,
        paystack_reference=booking.paystack_reference,
        slot_starts_at=booking.slot.starts_at,
        slot_ends_at=booking.slot.ends_at,
        confirmed_at=booking.confirmed_at,
        created_at=booking.created_at,
        receipt_number=receipt.receipt_number if receipt else None,
    )


@router.post(
    "/admin/walk-in-bookings",
    response_model=WalkInBookingCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_walk_in_booking_route(
    payload: WalkInBookingCreateRequest,
    user: SessionsManageUser,
    db: DbSession,
) -> WalkInBookingCreateResponse:
    result = create_walk_in_booking(
        db,
        staff_user=user,
        customer_full_name=payload.customer_full_name,
        customer_phone=payload.customer_phone,
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        session_type_id=payload.session_type_id,
        package_name=payload.package_name,
        package_description=payload.package_description,
        package_price_ghs=payload.package_price_ghs,
        package_duration_minutes=payload.package_duration_minutes,
        slot_id=payload.slot_id,
        pictures_count=payload.pictures_count,
        picture_pickup_date=payload.picture_pickup_date,
        accepted_at=payload.accepted_at,
        payment_method=payload.payment_method,
        amount_paid_ghs=payload.amount_paid_ghs,
    )
    log_action(
        db,
        actor=user,
        action="walk_in_booking.created",
        resource_type="booking",
        resource_id=str(result["booking_id"]),
        metadata={"payment_method": payload.payment_method.value},
    )
    db.commit()
    return WalkInBookingCreateResponse(
        booking_id=result["booking_id"],
        payment_method=payload.payment_method,
        status=result.get("status"),
        reference=result["reference"],
        amount_paid_ghs=result.get("amount_paid_ghs") or result.get("amount_ghs"),
        total_price_ghs=result["total_price_ghs"],
        balance_due_ghs=result["balance_due_ghs"],
        receipt_number=result.get("receipt_number"),
        authorization_url=result.get("authorization_url"),
        public_key=result.get("public_key"),
        message=result.get("message"),
    )


@router.get("/admin/walk-in-bookings/{booking_id}", response_model=WalkInBookingDetailResponse)
def get_walk_in_booking_route(
    booking_id: UUID,
    _user: BookingsViewUser,
    db: DbSession,
) -> WalkInBookingDetailResponse:
    booking = get_walk_in_booking_detail(db, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Walk-in booking not found")
    return _walk_in_detail(booking)

