from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.deps import CustomerUser, DbSession
from app.models.booking import Booking
from app.models.receipt import Receipt
from app.models.session_type import SessionType
from app.schemas.booking import BookingDetailResponse, CheckoutRequest, CheckoutResponse, ReceiptSummary
from app.schemas.session import HoldCreateRequest, HoldResponse, SessionTypeResponse, StudioSlotResponse
from app.services.booking_checkout import checkout_booking, create_hold, release_hold
from app.services.slot_availability import get_available_slots

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
        deposit_amount_ghs=booking.deposit_amount_ghs,
        total_price_ghs=booking.total_price_ghs,
        balance_due_ghs=booking.balance_due_ghs,
        paystack_reference=booking.paystack_reference,
        confirmed_at=booking.confirmed_at,
        created_at=booking.created_at,
        session_type_name=booking.session_type.name,
        slot_starts_at=booking.slot.starts_at,
        slot_ends_at=booking.slot.ends_at,
        receipt=ReceiptSummary.model_validate(receipt) if receipt else None,
    )


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
    result = checkout_booking(db, user, payload.hold_id)
    return CheckoutResponse(**result)


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
