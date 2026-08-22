from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.deps import CustomerUser, DbSession
from app.models.booking import Booking
from app.models.receipt import Receipt
from app.models.session_type import SessionType
from app.schemas.booking import (
    BookingDetailResponse,
    BookingSettingsResponse,
    CheckoutRequest,
    CheckoutResponse,
    ReceiptSummary,
)
from app.schemas.walk_in_booking import (
    WalkInBookingCreateRequest,
    WalkInBookingCreateResponse,
    WalkInBookingDetailResponse,
)
from app.schemas.session import HoldCreateRequest, HoldResponse, SessionTypeResponse, StudioSlotResponse
from app.services.booking_checkout import checkout_booking, create_hold, release_hold
from app.services.slot_availability import get_available_slots, get_booking_settings
from app.services.walk_in_booking import (
    create_walk_in_booking as submit_walk_in_booking,
    get_walk_in_booking_for_user,
    list_walk_in_bookings_for_user,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _booking_detail(db, booking: Booking) -> BookingDetailResponse:
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.session_type),
            joinedload(Booking.slot),
            joinedload(Booking.receipts),
        )
        .filter(Booking.id == booking.id)
        .first()
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    receipt = booking.receipts[0] if booking.receipts else None
    return BookingDetailResponse(
        id=booking.id,
        status=booking.status.value,
        booking_source=booking.booking_source.value,
        payment_method=booking.payment_method.value if booking.payment_method else None,
        deposit_amount_ghs=booking.deposit_amount_ghs,
        total_price_ghs=booking.total_price_ghs,
        balance_due_ghs=booking.balance_due_ghs,
        paystack_reference=booking.paystack_reference,
        confirmed_at=booking.confirmed_at,
        created_at=booking.created_at,
        session_type_name=booking.session_type.name,
        package_name=booking.package_name,
        package_description=booking.package_description,
        package_duration_minutes=booking.package_duration_minutes,
        pictures_count=booking.pictures_count,
        picture_pickup_date=booking.picture_pickup_date,
        accepted_at=booking.accepted_at,
        slot_starts_at=booking.slot.starts_at,
        slot_ends_at=booking.slot.ends_at,
        receipt=ReceiptSummary.model_validate(receipt) if receipt else None,
    )


@router.get("/deposits", response_model=BookingSettingsResponse)
def list_deposit_amounts(db: DbSession) -> BookingSettingsResponse:
    return get_booking_settings(db)


@router.get("/types", response_model=list[SessionTypeResponse])
def list_session_types(db: DbSession) -> list[SessionType]:
    return (
        db.query(SessionType)
        .filter(SessionType.is_active.is_(True))
        .order_by(SessionType.name.asc())
        .all()
    )


@router.get("/availability", response_model=list[StudioSlotResponse])
def list_availability(
    db: DbSession,
    start: datetime = Query(..., description="Range start (ISO datetime)"),
    end: datetime = Query(..., description="Range end (ISO datetime)"),
) -> list:
    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'end' must be after 'start'")
    return get_available_slots(db, start, end)


@router.post("/holds", response_model=HoldResponse, status_code=status.HTTP_201_CREATED)
def create_slot_hold(payload: HoldCreateRequest, user: CustomerUser, db: DbSession) -> HoldResponse:
    hold = create_hold(db, user, payload.slot_id, payload.session_type_id)
    return HoldResponse(
        id=hold.id,
        slot_id=hold.slot_id,
        session_type_id=hold.session_type_id,
        expires_at=hold.expires_at,
        status=hold.status.value,
    )


@router.delete("/holds/{hold_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slot_hold(hold_id: UUID, user: CustomerUser, db: DbSession) -> None:
    release_hold(db, user, hold_id)


@router.post("/bookings/checkout", response_model=CheckoutResponse)
def booking_checkout(payload: CheckoutRequest, user: CustomerUser, db: DbSession) -> CheckoutResponse:
    result = checkout_booking(
        db,
        user,
        payload.hold_id,
        pictures_count=payload.pictures_count,
        picture_pickup_date=payload.picture_pickup_date,
        accepted_at=payload.accepted_at,
        package_name=payload.package_name,
        package_description=payload.package_description,
        package_price_ghs=payload.package_price_ghs,
        package_duration_minutes=payload.package_duration_minutes,
    )
    return CheckoutResponse(**result)


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
    "/walk-in-bookings",
    response_model=WalkInBookingCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_walk_in_booking_route(
    payload: WalkInBookingCreateRequest,
    user: CustomerUser,
    db: DbSession,
) -> WalkInBookingCreateResponse:
    result = submit_walk_in_booking(
        db,
        user=user,
        customer_full_name=payload.customer_full_name,
        customer_phone=payload.customer_phone,
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


@router.get("/walk-in-bookings/me", response_model=list[WalkInBookingDetailResponse])
def my_walk_in_bookings(user: CustomerUser, db: DbSession) -> list[WalkInBookingDetailResponse]:
    bookings = list_walk_in_bookings_for_user(db, user.id)
    return [_walk_in_detail(booking) for booking in bookings]


@router.get("/walk-in-bookings/{booking_id}", response_model=WalkInBookingDetailResponse)
def get_walk_in_booking(
    booking_id: UUID,
    user: CustomerUser,
    db: DbSession,
) -> WalkInBookingDetailResponse:
    booking = get_walk_in_booking_for_user(db, booking_id, user.id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Walk-in booking not found")
    return _walk_in_detail(booking)


@router.get("/bookings/me", response_model=list[BookingDetailResponse])
def my_bookings(user: CustomerUser, db: DbSession) -> list[BookingDetailResponse]:
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_booking_detail(db, b) for b in bookings]


@router.get("/bookings/{booking_id}", response_model=BookingDetailResponse)
def get_booking(booking_id: UUID, user: CustomerUser, db: DbSession) -> BookingDetailResponse:
    booking = db.get(Booking, booking_id)
    if booking is None or booking.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return _booking_detail(db, booking)
