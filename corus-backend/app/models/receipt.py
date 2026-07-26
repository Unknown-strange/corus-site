import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReceiptTypeEnum(str, enum.Enum):
    session_deposit = "session_deposit"
    order_payment = "order_payment"
    rental_payment = "rental_payment"
    reservation_deposit = "reservation_deposit"


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (UniqueConstraint("receipt_number", name="uq_receipts_number"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False, unique=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True, index=True
    )
    rental_request_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rental_requests.id"), nullable=True, index=True
    )
    reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studio_reservations.id"), nullable=True, index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    receipt_number: Mapped[str] = mapped_column(String(50), nullable=False)
    receipt_type: Mapped[ReceiptTypeEnum | None] = mapped_column(
        Enum(ReceiptTypeEnum, name="receipt_type"), nullable=True
    )
    amount_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    summary_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    pdf_file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    payment: Mapped["Payment"] = relationship("Payment", back_populates="receipt")
    booking: Mapped["Booking | None"] = relationship("Booking", back_populates="receipts")
    rental_request: Mapped["RentalRequest | None"] = relationship(
        "RentalRequest", back_populates="receipts"
    )
    reservation: Mapped["StudioReservation | None"] = relationship(
        "StudioReservation", back_populates="receipts"
    )
    order: Mapped["Order | None"] = relationship("Order", back_populates="receipts")
    user: Mapped["User"] = relationship("User")
