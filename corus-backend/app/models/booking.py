import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BookingStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studio_slots.id"), nullable=False, index=True
    )
    session_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("session_types.id"), nullable=False
    )
    hold_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("slot_holds.id"), nullable=True
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"),
        default=BookingStatus.pending_payment,
        nullable=False,
    )
    deposit_amount_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    balance_due_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paystack_reference: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User")
    slot: Mapped["StudioSlot"] = relationship("StudioSlot", back_populates="bookings")
    session_type: Mapped["SessionType"] = relationship("SessionType")
    hold: Mapped["SlotHold | None"] = relationship("SlotHold")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="booking")
    receipts: Mapped[list["Receipt"]] = relationship("Receipt", back_populates="booking")
