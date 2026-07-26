import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FinancialRecordType(str, enum.Enum):
    income = "income"
    expense = "expense"


class FinancialRecordSource(str, enum.Enum):
    payment = "payment"
    manual = "manual"


class FinancialCategory(str, enum.Enum):
    session_deposit = "session_deposit"
    order_payment = "order_payment"
    rental_payment = "rental_payment"
    reservation_deposit = "reservation_deposit"
    cash_income = "cash_income"
    other_income = "other_income"
    rent = "rent"
    utilities = "utilities"
    equipment = "equipment"
    payroll = "payroll"
    marketing = "marketing"
    supplies = "supplies"
    other_expense = "other_expense"


INCOME_CATEGORIES = frozenset(
    {
        FinancialCategory.session_deposit,
        FinancialCategory.order_payment,
        FinancialCategory.rental_payment,
        FinancialCategory.reservation_deposit,
        FinancialCategory.cash_income,
        FinancialCategory.other_income,
    }
)

EXPENSE_CATEGORIES = frozenset(
    {
        FinancialCategory.rent,
        FinancialCategory.utilities,
        FinancialCategory.equipment,
        FinancialCategory.payroll,
        FinancialCategory.marketing,
        FinancialCategory.supplies,
        FinancialCategory.other_expense,
    }
)


class FinancialRecord(Base):
    __tablename__ = "financial_records"
    __table_args__ = (UniqueConstraint("payment_id", name="uq_financial_records_payment_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    record_type: Mapped[FinancialRecordType] = mapped_column(
        Enum(FinancialRecordType, name="financial_record_type"),
        nullable=False,
        index=True,
    )
    source: Mapped[FinancialRecordSource] = mapped_column(
        Enum(FinancialRecordSource, name="financial_record_source"),
        nullable=False,
        index=True,
    )
    amount_ghs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    record_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    category: Mapped[FinancialCategory] = mapped_column(
        Enum(FinancialCategory, name="financial_category"),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    payment: Mapped["Payment | None"] = relationship("Payment")
    created_by: Mapped["User | None"] = relationship("User", foreign_keys=[created_by_id])
    updated_by: Mapped["User | None"] = relationship("User", foreign_keys=[updated_by_id])
