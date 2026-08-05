from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.core.admin_deps import DashboardViewUser
from app.core.deps import DbSession
from app.schemas.analytics import AnalyticsOverviewResponse, TrendInterval, TrendResponse
from app.services.analytics_service import (
    get_analytics_overview,
    get_booking_trends,
    get_product_trends,
    get_rental_trends,
    resolve_range,
)

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])

StartQuery = Query(default=None, description="Start date (studio timezone), inclusive")
EndQuery = Query(default=None, description="End date (studio timezone), inclusive")
IntervalQuery = Query(default=TrendInterval.month)
TopLimitQuery = Query(default=5, ge=1, le=20)


def _resolved_range(start: date | None, end: date | None):
    if start and end and start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be on or before end",
        )
    return resolve_range(start, end)


@router.get("/bookings", response_model=TrendResponse)
def booking_trends(
    _user: DashboardViewUser,
    db: DbSession,
    start: date | None = StartQuery,
    end: date | None = EndQuery,
    interval: TrendInterval = IntervalQuery,
    top_limit: int = TopLimitQuery,
) -> TrendResponse:
    period_start, period_end = _resolved_range(start, end)
    return get_booking_trends(
        db, start=period_start, end=period_end, interval=interval, top_limit=top_limit
    )


@router.get("/rentals", response_model=TrendResponse)
def rental_trends(
    _user: DashboardViewUser,
    db: DbSession,
    start: date | None = StartQuery,
    end: date | None = EndQuery,
    interval: TrendInterval = IntervalQuery,
    top_limit: int = TopLimitQuery,
) -> TrendResponse:
    period_start, period_end = _resolved_range(start, end)
    return get_rental_trends(
        db, start=period_start, end=period_end, interval=interval, top_limit=top_limit
    )


@router.get("/products", response_model=TrendResponse)
def product_trends(
    _user: DashboardViewUser,
    db: DbSession,
    start: date | None = StartQuery,
    end: date | None = EndQuery,
    interval: TrendInterval = IntervalQuery,
    top_limit: int = TopLimitQuery,
) -> TrendResponse:
    period_start, period_end = _resolved_range(start, end)
    return get_product_trends(
        db, start=period_start, end=period_end, interval=interval, top_limit=top_limit
    )


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def analytics_overview(
    _user: DashboardViewUser,
    db: DbSession,
    start: date | None = StartQuery,
    end: date | None = EndQuery,
    interval: TrendInterval = IntervalQuery,
    top_limit: int = TopLimitQuery,
) -> AnalyticsOverviewResponse:
    period_start, period_end = _resolved_range(start, end)
    return get_analytics_overview(
        db, start=period_start, end=period_end, interval=interval, top_limit=top_limit
    )
