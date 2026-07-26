import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base


class BookingSettings(Base):
    __tablename__ = "booking_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_deposit_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reservation_deposit_ghs: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=lambda: Decimal(str(settings.reservation_deposit_ghs))
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
