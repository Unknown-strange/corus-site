from datetime import datetime

from fastapi import APIRouter, Query

from app.core.admin_deps import AdminOnlyUser
from app.core.deps import DbSession
from app.models.audit_log import AuditLog
from app.schemas.admin_ops import AuditLogResponse
from app.schemas.pagination import PaginatedResponse, build_paginated_response

router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit"])


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def list_audit_logs(
    _admin: AdminOnlyUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> PaginatedResponse[AuditLogResponse]:
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if from_date:
        query = query.filter(AuditLog.created_at >= from_date)
    if to_date:
        query = query.filter(AuditLog.created_at <= to_date)

    total = query.count()
    logs = query.offset((page - 1) * limit).limit(limit).all()
    items = [AuditLogResponse.model_validate(log) for log in logs]
    return build_paginated_response(items, total=total, page=page, limit=limit)
