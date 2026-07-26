from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.product import ProductForSale
from app.models.receipt import Receipt
from app.models.rental_request import RentalRequest, RentalStatus
from app.models.studio_reservation import ReservationStatus, StudioReservation
from app.models.studio_slot import StudioSlot
from app.models.user import User
from app.schemas.dashboard import (
    ActivityFeedItem,
    DashboardFinancialSummary,
    DashboardSummaryResponse,
    LowStockProductItem,
    PendingReservationItem,
    TodayBookingItem,
)
from app.services.finance_service import current_month_bounds_utc, get_finance_summary


def _studio_tz() -> ZoneInfo:
    return ZoneInfo(settings.studio_timezone)


def _today_bounds_utc() -> tuple[datetime, datetime]:
    tz = _studio_tz()
    now_local = datetime.now(tz)
    start_local = datetime.combine(now_local.date(), time.min, tzinfo=tz)
    end_local = datetime.combine(now_local.date(), time.max, tzinfo=tz)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    pending_count = (
        db.query(func.count(StudioReservation.id))
        .filter(StudioReservation.status == ReservationStatus.pending)
        .scalar()
        or 0
    )
    pending_top = (
        db.query(StudioReservation)
        .filter(StudioReservation.status == ReservationStatus.pending)
        .order_by(StudioReservation.created_at.asc())
        .limit(5)
        .all()
    )
    pending_items: list[PendingReservationItem] = []
    for reservation in pending_top:
        user = db.get(User, reservation.user_id)
        pending_items.append(
            PendingReservationItem(
                id=reservation.id,
                customer_email=user.email if user else None,
                customer_name=user.first_name if user else None,
                requested_start=reservation.requested_start,
                requested_end=reservation.requested_end,
                purpose=reservation.purpose,
                created_at=reservation.created_at,
            )
        )

    products = db.query(ProductForSale).filter(ProductForSale.is_active.is_(True)).all()
    low_stock = [
        LowStockProductItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            stock=p.stock,
            low_stock_threshold=p.effective_low_stock_threshold,
        )
        for p in products
        if p.is_low_stock
    ]

    today_start, today_end = _today_bounds_utc()
    todays_bookings_rows = (
        db.query(Booking)
        .join(StudioSlot, Booking.slot_id == StudioSlot.id)
        .options(joinedload(Booking.session_type), joinedload(Booking.slot))
        .filter(
            StudioSlot.starts_at >= today_start,
            StudioSlot.starts_at <= today_end,
            Booking.status == BookingStatus.confirmed,
        )
        .order_by(StudioSlot.starts_at.asc())
        .all()
    )
    todays_bookings = [
        TodayBookingItem(
            id=b.id,
            user_id=b.user_id,
            session_type_name=b.session_type.name if b.session_type else "",
            slot_starts_at=b.slot.starts_at,
            slot_ends_at=b.slot.ends_at,
            status=b.status.value,
        )
        for b in todays_bookings_rows
    ]

    active_rentals_count = (
        db.query(func.count(RentalRequest.id))
        .filter(RentalRequest.status == RentalStatus.active)
        .scalar()
        or 0
    )

    pending_orders_count = (
        db.query(func.count(Order.id))
        .filter(Order.status.in_([OrderStatus.pending, OrderStatus.processing]))
        .scalar()
        or 0
    )

    today_start, today_end = _today_bounds_utc()
    payments_today = (
        db.query(func.coalesce(func.sum(Payment.amount_pesewas), 0))
        .filter(
            Payment.status == PaymentStatus.success,
            Payment.created_at >= today_start,
            Payment.created_at <= today_end,
        )
        .scalar()
        or 0
    )
    payments_today_ghs = Decimal(payments_today) / Decimal(100)

    period_start, period_end = current_month_bounds_utc()
    finance = get_finance_summary(db, period_start, period_end)

    return DashboardSummaryResponse(
        pending_reservation_approvals=pending_count,
        pending_reservations_top=pending_items,
        low_stock_products=low_stock,
        low_stock_count=len(low_stock),
        todays_bookings=todays_bookings,
        todays_bookings_count=len(todays_bookings),
        active_rentals=active_rentals_count,
        pending_orders=pending_orders_count,
        payments_today_ghs=payments_today_ghs,
        financial_summary=DashboardFinancialSummary(
            total_income_ghs=finance.total_income_ghs,
            total_expenses_ghs=finance.total_expenses_ghs,
            profit_ghs=finance.profit_ghs,
            period_start=finance.period_start,
            period_end=finance.period_end,
        ),
        studio_timezone=settings.studio_timezone,
    )


def get_activity_feed(
    db: Session,
    *,
    page: int = 1,
    limit: int = 50,
    days: int = 30,
) -> tuple[list[ActivityFeedItem], int]:
    cutoff = datetime.now(UTC) - timedelta(days=days)
    events: list[ActivityFeedItem] = []

    orders = (
        db.query(Order)
        .filter(Order.created_at >= cutoff)
        .order_by(Order.created_at.desc())
        .limit(500)
        .all()
    )
    for order in orders:
        events.append(
            ActivityFeedItem(
                id=order.id,
                event_type="order",
                title=f"Order {order.status.value}",
                description=f"Total GHS {order.total_ghs}",
                user_id=order.user_id,
                occurred_at=order.created_at,
                reference_id=str(order.id),
            )
        )

    bookings = (
        db.query(Booking)
        .options(joinedload(Booking.session_type))
        .filter(Booking.created_at >= cutoff)
        .order_by(Booking.created_at.desc())
        .limit(500)
        .all()
    )
    for booking in bookings:
        session_name = booking.session_type.name if booking.session_type else "Session"
        events.append(
            ActivityFeedItem(
                id=booking.id,
                event_type="booking",
                title=f"Booking {booking.status.value}",
                description=session_name,
                user_id=booking.user_id,
                occurred_at=booking.created_at,
                reference_id=str(booking.id),
            )
        )

    rentals = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.created_at >= cutoff)
        .order_by(RentalRequest.created_at.desc())
        .limit(500)
        .all()
    )
    for rental in rentals:
        equipment_name = rental.equipment.name if rental.equipment else "Equipment"
        events.append(
            ActivityFeedItem(
                id=rental.id,
                event_type="rental",
                title=f"Rental {rental.status.value}",
                description=equipment_name,
                user_id=rental.user_id,
                occurred_at=rental.created_at,
                reference_id=str(rental.id),
            )
        )

    reservations = (
        db.query(StudioReservation)
        .filter(StudioReservation.created_at >= cutoff)
        .order_by(StudioReservation.created_at.desc())
        .limit(500)
        .all()
    )
    for reservation in reservations:
        events.append(
            ActivityFeedItem(
                id=reservation.id,
                event_type="reservation",
                title=f"Reservation {reservation.status.value}",
                description=reservation.purpose or "Studio reservation",
                user_id=reservation.user_id,
                occurred_at=reservation.created_at,
                reference_id=str(reservation.id),
            )
        )

    receipts = (
        db.query(Receipt)
        .filter(Receipt.issued_at >= cutoff)
        .order_by(Receipt.issued_at.desc())
        .limit(500)
        .all()
    )
    for receipt in receipts:
        events.append(
            ActivityFeedItem(
                id=receipt.id,
                event_type="receipt",
                title=f"Receipt {receipt.receipt_number}",
                description=f"GHS {receipt.amount_ghs}",
                user_id=receipt.user_id,
                occurred_at=receipt.issued_at,
                reference_id=str(receipt.id),
            )
        )

    events.sort(key=lambda e: e.occurred_at, reverse=True)
    total = len(events)
    start = (page - 1) * limit
    end = start + limit
    return events[start:end], total
