from fastapi import APIRouter, Query

from app.core.admin_deps import DashboardViewUser
from app.core.deps import DbSession
from app.schemas.dashboard import ActivityFeedItem, DashboardSummaryResponse
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.services.dashboard_service import get_activity_feed, get_dashboard_summary

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(_user: DashboardViewUser, db: DbSession) -> DashboardSummaryResponse:
    return get_dashboard_summary(db)


@router.get("/activity", response_model=PaginatedResponse[ActivityFeedItem])
def dashboard_activity(
    _user: DashboardViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    days: int = Query(default=30, ge=1, le=90),
) -> PaginatedResponse[ActivityFeedItem]:
    items, total = get_activity_feed(db, page=page, limit=limit, days=days)
    return build_paginated_response(items, total=total, page=page, limit=limit)
