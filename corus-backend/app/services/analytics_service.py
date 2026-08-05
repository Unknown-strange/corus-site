"""Trend aggregations for the admin dashboard: bookings, rentals, and product sales."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.equipment_for_rent import EquipmentForRent
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.rental_request import RentalRequest, RentalStatus
from app.models.session_type import SessionType
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TopItem,
    TrendInterval,
    TrendPoint,
    TrendResponse,
)

DEFAULT_RANGE_MONTHS = 12

COUNTED_BOOKING_STATUSES = (BookingStatus.confirmed,)

COUNTED_RENTAL_STATUSES = (
    RentalStatus.paid,
    RentalStatus.active,
    RentalStatus.returned,
)

COUNTED_ORDER_STATUSES = (
    OrderStatus.pending,
    OrderStatus.processing,
    OrderStatus.in_route,
    OrderStatus.delivered,
)


def _studio_tz() -> ZoneInfo:
    return ZoneInfo(settings.studio_timezone)


def resolve_range(start: date | None, end: date | None) -> tuple[datetime, datetime]:
    """Turn optional local dates into an inclusive UTC range covering whole studio days."""
    tz = _studio_tz()
    today_local = datetime.now(tz).date()
    end_date = end or today_local
    start_date = start or (end_date - timedelta(days=DEFAULT_RANGE_MONTHS * 31))

    start_utc = datetime.combine(start_date, time.min, tzinfo=tz).astimezone(UTC)
    end_utc = datetime.combine(end_date, time.max, tzinfo=tz).astimezone(UTC)
    return start_utc, end_utc


def _bucket_expr(column, interval: TrendInterval):
    local_ts = func.timezone(settings.studio_timezone, column)
    return func.date_trunc(interval.value, local_ts)


def _next_bucket(bucket: date, interval: TrendInterval) -> date:
    if interval == TrendInterval.day:
        return bucket + timedelta(days=1)
    if interval == TrendInterval.week:
        return bucket + timedelta(weeks=1)
    if bucket.month == 12:
        return date(bucket.year + 1, 1, 1)
    return date(bucket.year, bucket.month + 1, 1)


def _first_bucket(moment: datetime, interval: TrendInterval) -> date:
    local_date = moment.astimezone(_studio_tz()).date()
    if interval == TrendInterval.day:
        return local_date
    if interval == TrendInterval.week:
        return local_date - timedelta(days=local_date.weekday())
    return date(local_date.year, local_date.month, 1)


def _fill_gaps(
    rows: dict[date, tuple[int, Decimal]],
    start: datetime,
    end: datetime,
    interval: TrendInterval,
) -> list[TrendPoint]:
    """Emit a continuous series so charts do not skip empty periods."""
    points: list[TrendPoint] = []
    cursor = _first_bucket(start, interval)
    last = _first_bucket(end, interval)
    while cursor <= last:
        count, revenue = rows.get(cursor, (0, Decimal("0")))
        points.append(TrendPoint(bucket=cursor, count=count, revenue_ghs=revenue))
        cursor = _next_bucket(cursor, interval)
    return points


def _as_bucket_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    return value


def _build_response(
    rows: list[tuple],
    top_rows: list[tuple],
    *,
    start: datetime,
    end: datetime,
    interval: TrendInterval,
) -> TrendResponse:
    series: dict[date, tuple[int, Decimal]] = {}
    total_count = 0
    total_revenue = Decimal("0")
    for bucket, count, revenue in rows:
        bucket_date = _as_bucket_date(bucket)
        count = int(count or 0)
        revenue = Decimal(revenue or 0)
        series[bucket_date] = (count, revenue)
        total_count += count
        total_revenue += revenue

    top_items = [
        TopItem(
            id=item_id,
            name=name or "Unknown",
            count=int(count or 0),
            revenue_ghs=Decimal(revenue or 0),
        )
        for item_id, name, count, revenue in top_rows
    ]

    return TrendResponse(
        interval=interval,
        period_start=start,
        period_end=end,
        total_count=total_count,
        total_revenue_ghs=total_revenue,
        points=_fill_gaps(series, start, end, interval),
        top_items=top_items,
    )


def get_booking_trends(
    db: Session,
    *,
    start: datetime,
    end: datetime,
    interval: TrendInterval,
    top_limit: int = 5,
) -> TrendResponse:
    bucket = _bucket_expr(Booking.created_at, interval).label("bucket")
    base_filters = (
        Booking.created_at >= start,
        Booking.created_at <= end,
        Booking.status.in_(COUNTED_BOOKING_STATUSES),
    )

    rows = (
        db.query(
            bucket,
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total_price_ghs), 0),
        )
        .filter(*base_filters)
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )

    top_rows = (
        db.query(
            SessionType.id,
            SessionType.name,
            func.count(Booking.id).label("count"),
            func.coalesce(func.sum(Booking.total_price_ghs), 0).label("revenue"),
        )
        .join(SessionType, Booking.session_type_id == SessionType.id)
        .filter(*base_filters)
        .group_by(SessionType.id, SessionType.name)
        .order_by(func.count(Booking.id).desc())
        .limit(top_limit)
        .all()
    )

    return _build_response(rows, top_rows, start=start, end=end, interval=interval)


def get_rental_trends(
    db: Session,
    *,
    start: datetime,
    end: datetime,
    interval: TrendInterval,
    top_limit: int = 5,
) -> TrendResponse:
    bucket = _bucket_expr(RentalRequest.created_at, interval).label("bucket")
    base_filters = (
        RentalRequest.created_at >= start,
        RentalRequest.created_at <= end,
        RentalRequest.status.in_(COUNTED_RENTAL_STATUSES),
    )

    rows = (
        db.query(
            bucket,
            func.count(RentalRequest.id),
            func.coalesce(func.sum(RentalRequest.total_price_ghs), 0),
        )
        .filter(*base_filters)
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )

    top_rows = (
        db.query(
            EquipmentForRent.id,
            EquipmentForRent.name,
            func.count(RentalRequest.id).label("count"),
            func.coalesce(func.sum(RentalRequest.total_price_ghs), 0).label("revenue"),
        )
        .join(EquipmentForRent, RentalRequest.equipment_id == EquipmentForRent.id)
        .filter(*base_filters)
        .group_by(EquipmentForRent.id, EquipmentForRent.name)
        .order_by(func.count(RentalRequest.id).desc())
        .limit(top_limit)
        .all()
    )

    return _build_response(rows, top_rows, start=start, end=end, interval=interval)


def get_product_trends(
    db: Session,
    *,
    start: datetime,
    end: datetime,
    interval: TrendInterval,
    top_limit: int = 5,
) -> TrendResponse:
    bucket = _bucket_expr(Order.created_at, interval).label("bucket")
    base_filters = (
        Order.created_at >= start,
        Order.created_at <= end,
        Order.status.in_(COUNTED_ORDER_STATUSES),
    )

    rows = (
        db.query(
            bucket,
            func.coalesce(func.sum(OrderItem.quantity), 0),
            func.coalesce(func.sum(OrderItem.line_total_ghs), 0),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(*base_filters)
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )

    top_rows = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("count"),
            func.coalesce(func.sum(OrderItem.line_total_ghs), 0).label("revenue"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(*base_filters)
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.coalesce(func.sum(OrderItem.quantity), 0).desc())
        .limit(top_limit)
        .all()
    )

    return _build_response(rows, top_rows, start=start, end=end, interval=interval)


def get_analytics_overview(
    db: Session,
    *,
    start: datetime,
    end: datetime,
    interval: TrendInterval,
    top_limit: int = 5,
) -> AnalyticsOverviewResponse:
    kwargs = {"start": start, "end": end, "interval": interval, "top_limit": top_limit}
    return AnalyticsOverviewResponse(
        interval=interval,
        period_start=start,
        period_end=end,
        bookings=get_booking_trends(db, **kwargs),
        rentals=get_rental_trends(db, **kwargs),
        products=get_product_trends(db, **kwargs),
        studio_timezone=settings.studio_timezone,
    )
