import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class PaymentPurpose(str, enum.Enum):
    session_deposit = "session_deposit"
    rental_payment = "rental_payment"
    reservation_deposit = "reservation_deposit"
    order_payment = "order_payment"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("reference", name="uq_payments_reference"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
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
    reference: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_pesewas: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.pending,
        nullable=False,
    )
    purpose: Mapped[PaymentPurpose] = mapped_column(
        Enum(PaymentPurpose, name="payment_purpose"),
        nullable=False,
    )
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    paystack_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    booking: Mapped["Booking | None"] = relationship("Booking", back_populates="payments")
    rental_request: Mapped["RentalRequest | None"] = relationship(
        "RentalRequest", back_populates="payments"
    )
    reservation: Mapped["StudioReservation | None"] = relationship(
        "StudioReservation", back_populates="payments"
    )
    order: Mapped["Order | None"] = relationship("Order", back_populates="payments")
    user: Mapped["User"] = relationship("User")
    receipt: Mapped["Receipt | None"] = relationship("Receipt", back_populates="payment", uselist=False)
