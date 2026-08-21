"""Financial ledger: sync payments, manual CRUD, summaries, and alerts."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, time
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.financial_record import (
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    FinancialCategory,
    FinancialRecord,
    FinancialRecordSource,
    FinancialRecordType,
)
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.user import User
from app.schemas.finance import (
    FinanceAlertItem,
    FinanceAlertsResponse,
    FinanceSummaryResponse,
    FinancialRecordCreateRequest,
    FinancialRecordUpdateRequest,
)

logger = logging.getLogger(__name__)

PURPOSE_TO_CATEGORY: dict[PaymentPurpose, FinancialCategory] = {
    PaymentPurpose.session_deposit: FinancialCategory.session_deposit,
    PaymentPurpose.order_payment: FinancialCategory.order_payment,
    PaymentPurpose.rental_payment: FinancialCategory.rental_payment,
    PaymentPurpose.reservation_deposit: FinancialCategory.reservation_deposit,
    PaymentPurpose.walk_in_offline: FinancialCategory.session_deposit,
}

PURPOSE_LABELS: dict[PaymentPurpose, str] = {
    PaymentPurpose.session_deposit: "Session deposit",
    PaymentPurpose.order_payment: "Order payment",
    PaymentPurpose.rental_payment: "Rental payment",
    PaymentPurpose.reservation_deposit: "Reservation deposit",
    PaymentPurpose.walk_in_offline: "Walk-in session payment",
}


@dataclass
class RecordFilters:
    record_type: FinancialRecordType | None = None
    source: FinancialRecordSource | None = None
    category: FinancialCategory | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    search: str | None = None


def _studio_tz() -> ZoneInfo:
    return ZoneInfo(settings.studio_timezone)


def current_month_bounds_utc() -> tuple[datetime, datetime]:
    tz = _studio_tz()
    now_local = datetime.now(tz)
    start_local = datetime(now_local.year, now_local.month, 1, tzinfo=tz)
    if now_local.month == 12:
        end_local = datetime(now_local.year + 1, 1, 1, tzinfo=tz)
    else:
        end_local = datetime(now_local.year, now_local.month + 1, 1, tzinfo=tz)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def _parse_record_type(value: str) -> FinancialRecordType:
    try:
        return FinancialRecordType(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid record_type")


def _parse_category(value: str) -> FinancialCategory:
    try:
        return FinancialCategory(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")


def _validate_category_for_type(record_type: FinancialRecordType, category: FinancialCategory) -> None:
    if record_type == FinancialRecordType.income and category not in INCOME_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category is not valid for income records",
        )
    if record_type == FinancialRecordType.expense and category not in EXPENSE_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category is not valid for expense records",
        )


def sync_payment_to_ledger(db: Session, payment: Payment) -> FinancialRecord | None:
    if payment.status != PaymentStatus.success:
        return None

    existing = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.payment_id == payment.id)
        .first()
    )
    if existing is not None:
        return existing

    category = PURPOSE_TO_CATEGORY.get(payment.purpose)
    if category is None:
        logger.warning("Unknown payment purpose for ledger sync: %s", payment.purpose)
        return None

    user = db.get(User, payment.user_id)
    customer_name = user.first_name or user.email or "Customer" if user else "Customer"
    purpose_label = PURPOSE_LABELS.get(payment.purpose, payment.purpose.value)

    record = FinancialRecord(
        record_type=FinancialRecordType.income,
        source=FinancialRecordSource.payment,
        amount_ghs=Decimal(payment.amount_pesewas) / Decimal(100),
        record_date=payment.created_at,
        category=category,
        description=f"Paystack reference: {payment.reference}",
        source_label=f"{customer_name} — {purpose_label}",
        payment_id=payment.id,
    )
    db.add(record)
    db.flush()
    return record


def create_manual_record(
    db: Session,
    actor: User,
    payload: FinancialRecordCreateRequest,
) -> FinancialRecord:
    record_type = _parse_record_type(payload.record_type)
    category = _parse_category(payload.category)
    _validate_category_for_type(record_type, category)

    record = FinancialRecord(
        record_type=record_type,
        source=FinancialRecordSource.manual,
        amount_ghs=payload.amount_ghs,
        record_date=payload.record_date,
        category=category,
        description=payload.description,
        source_label=payload.source_label,
        created_by_id=actor.id,
        updated_by_id=actor.id,
    )
    db.add(record)
    db.flush()
    return record


def update_record(
    db: Session,
    actor: User,
    record_id: UUID,
    payload: FinancialRecordUpdateRequest,
) -> FinancialRecord:
    record = db.get(FinancialRecord, record_id)
    if record is None or record.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    data = payload.model_dump(exclude_unset=True)

    if record.source == FinancialRecordSource.payment:
        allowed = {"category", "description", "source_label"}
        disallowed = set(data.keys()) - allowed
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment-synced records cannot edit: {', '.join(sorted(disallowed))}",
            )
        if "category" in data and data["category"] is not None:
            category = _parse_category(data["category"])
            if category not in INCOME_CATEGORIES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment-synced records must use an income category",
                )
            record.category = category
        if "description" in data:
            record.description = data["description"]
        if "source_label" in data:
            record.source_label = data["source_label"]
    else:
        new_type = record.record_type
        if "record_type" in data and data["record_type"] is not None:
            new_type = _parse_record_type(data["record_type"])
            record.record_type = new_type
        if "amount_ghs" in data and data["amount_ghs"] is not None:
            record.amount_ghs = data["amount_ghs"]
        if "record_date" in data and data["record_date"] is not None:
            record.record_date = data["record_date"]
        if "category" in data and data["category"] is not None:
            category = _parse_category(data["category"])
            _validate_category_for_type(new_type, category)
            record.category = category
        if "description" in data:
            record.description = data["description"]
        if "source_label" in data:
            record.source_label = data["source_label"]

    record.updated_by_id = actor.id
    db.add(record)
    db.flush()
    return record


def soft_delete_record(db: Session, actor: User, record_id: UUID) -> None:
    record = db.get(FinancialRecord, record_id)
    if record is None or record.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    if record.source == FinancialRecordSource.payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment-synced records cannot be deleted",
        )
    record.is_deleted = True
    record.updated_by_id = actor.id
    db.add(record)
    db.flush()


def _apply_filters(query, filters: RecordFilters):
    query = query.filter(FinancialRecord.is_deleted.is_(False))
    if filters.record_type:
        query = query.filter(FinancialRecord.record_type == filters.record_type)
    if filters.source:
        query = query.filter(FinancialRecord.source == filters.source)
    if filters.category:
        query = query.filter(FinancialRecord.category == filters.category)
    if filters.from_date:
        query = query.filter(FinancialRecord.record_date >= filters.from_date)
    if filters.to_date:
        query = query.filter(FinancialRecord.record_date <= filters.to_date)
    if filters.search:
        term = f"%{filters.search.strip()}%"
        query = query.filter(
            or_(
                FinancialRecord.source_label.ilike(term),
                FinancialRecord.description.ilike(term),
            )
        )
    return query


def query_records(
    db: Session,
    filters: RecordFilters,
    *,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[FinancialRecord], int]:
    query = db.query(FinancialRecord).order_by(
        FinancialRecord.record_date.desc(),
        FinancialRecord.created_at.desc(),
    )
    query = _apply_filters(query, filters)
    total = query.count()
    records = query.offset((page - 1) * limit).limit(limit).all()
    return records, total


def query_records_for_export(db: Session, filters: RecordFilters) -> list[FinancialRecord]:
    query = db.query(FinancialRecord).order_by(
        FinancialRecord.record_date.asc(),
        FinancialRecord.created_at.asc(),
    )
    query = _apply_filters(query, filters)
    return query.all()


def get_finance_summary(
    db: Session,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> FinanceSummaryResponse:
    if from_date is None or to_date is None:
        period_start, period_end = current_month_bounds_utc()
    else:
        period_start, period_end = from_date, to_date

    filters = RecordFilters(from_date=period_start, to_date=period_end)
    base = _apply_filters(db.query(FinancialRecord), filters)

    income = (
        base.filter(FinancialRecord.record_type == FinancialRecordType.income)
        .with_entities(func.coalesce(func.sum(FinancialRecord.amount_ghs), 0))
        .scalar()
    )
    expenses = (
        _apply_filters(db.query(FinancialRecord), filters)
        .filter(FinancialRecord.record_type == FinancialRecordType.expense)
        .with_entities(func.coalesce(func.sum(FinancialRecord.amount_ghs), 0))
        .scalar()
    )
    count = base.count()

    total_income = Decimal(income or 0)
    total_expenses = Decimal(expenses or 0)

    return FinanceSummaryResponse(
        total_income_ghs=total_income,
        total_expenses_ghs=total_expenses,
        profit_ghs=total_income - total_expenses,
        record_count=count,
        period_start=period_start,
        period_end=period_end,
    )


def get_finance_alerts(db: Session) -> FinanceAlertsResponse:
    period_start, period_end = current_month_bounds_utc()
    summary = get_finance_summary(db, period_start, period_end)
    alerts: list[FinanceAlertItem] = []

    if settings.finance_low_profit_threshold_ghs is not None:
        threshold = Decimal(settings.finance_low_profit_threshold_ghs)
        if summary.profit_ghs < threshold:
            alerts.append(
                FinanceAlertItem(
                    alert_type="low_profit",
                    message=f"Current month profit ({summary.profit_ghs} GHS) is below threshold ({threshold} GHS)",
                    threshold_ghs=threshold,
                    actual_ghs=summary.profit_ghs,
                )
            )

    if settings.finance_high_expense_threshold_ghs is not None:
        threshold = Decimal(settings.finance_high_expense_threshold_ghs)
        if summary.total_expenses_ghs > threshold:
            alerts.append(
                FinanceAlertItem(
                    alert_type="high_expenses",
                    message=(
                        f"Current month expenses ({summary.total_expenses_ghs} GHS) "
                        f"exceed threshold ({threshold} GHS)"
                    ),
                    threshold_ghs=threshold,
                    actual_ghs=summary.total_expenses_ghs,
                )
            )

    return FinanceAlertsResponse(
        alerts=alerts,
        period_start=period_start,
        period_end=period_end,
    )


def record_to_response(record: FinancialRecord) -> dict:
    return {
        "id": record.id,
        "record_type": record.record_type.value,
        "source": record.source.value,
        "amount_ghs": record.amount_ghs,
        "record_date": record.record_date,
        "category": record.category.value,
        "description": record.description,
        "source_label": record.source_label,
        "payment_id": record.payment_id,
        "created_by_id": record.created_by_id,
        "updated_by_id": record.updated_by_id,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }
