import enum
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RentalStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    paid = "paid"
    active = "active"
    returned = "returned"
    cancelled = "cancelled"


class RentalRequest(Base):
    __tablename__ = "rental_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment_for_rent.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    rental_days: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[RentalStatus] = mapped_column(
        Enum(RentalStatus, name="rental_status"),
        default=RentalStatus.pending_payment,
        nullable=False,
    )
    paystack_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped["User"] = relationship("User")
    equipment: Mapped["EquipmentForRent"] = relationship(
        "EquipmentForRent", back_populates="rental_requests"
    )
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="rental_request")
    receipts: Mapped[list["Receipt"]] = relationship("Receipt", back_populates="rental_request")
