from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.booking_settings import BookingSettings
from app.models.slot_hold import HoldStatus, SlotHold
from app.models.studio_slot import StudioSlot


def get_booking_settings(db: Session) -> BookingSettings:
    row = db.query(BookingSettings).first()
    if row is None:
        row = BookingSettings(
            session_deposit_ghs=Decimal(str(settings.session_deposit_ghs)),
            reservation_deposit_ghs=Decimal(str(settings.reservation_deposit_ghs)),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_session_deposit_ghs(db: Session) -> Decimal:
    return get_booking_settings(db).session_deposit_ghs


def get_reservation_deposit_ghs(db: Session) -> Decimal:
    return get_booking_settings(db).reservation_deposit_ghs


def expire_stale_holds(db: Session) -> int:
    now = datetime.now(UTC)
    stale = (
        db.query(SlotHold)
        .filter(SlotHold.status == HoldStatus.active, SlotHold.expires_at < now)
        .all()
    )
    for hold in stale:
        hold.status = HoldStatus.expired
        db.add(hold)
    if stale:
        db.commit()
    return len(stale)


def slot_is_unavailable(db: Session, slot_id, exclude_hold_id=None) -> bool:
    expire_stale_holds(db)
    slot = db.get(StudioSlot, slot_id)
    if slot is None or slot.is_blocked:
        return True

    hold_query = db.query(SlotHold).filter(
        SlotHold.slot_id == slot_id,
        SlotHold.status == HoldStatus.active,
        SlotHold.expires_at >= datetime.now(UTC),
    )
    if exclude_hold_id is not None:
        hold_query = hold_query.filter(SlotHold.id != exclude_hold_id)

    if hold_query.first() is not None:
        return True

    confirmed = (
        db.query(Booking)
        .filter(
            Booking.slot_id == slot_id,
            Booking.status == BookingStatus.confirmed,
        )
        .first()
    )
    return confirmed is not None


def get_available_slots(db: Session, from_dt: datetime, to_dt: datetime) -> list[StudioSlot]:
    expire_stale_holds(db)
    slots = (
        db.query(StudioSlot)
        .filter(
            StudioSlot.is_blocked.is_(False),
            StudioSlot.starts_at >= from_dt,
            StudioSlot.starts_at <= to_dt,
        )
        .order_by(StudioSlot.starts_at.asc())
        .all()
    )
    return [slot for slot in slots if not slot_is_unavailable(db, slot.id)]


def hold_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=settings.slot_hold_minutes)
