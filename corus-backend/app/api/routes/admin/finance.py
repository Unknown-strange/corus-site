from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from app.core.admin_deps import FinanceManageUser, FinanceViewUser
from app.core.deps import DbSession
from app.models.financial_record import FinancialCategory, FinancialRecordSource, FinancialRecordType
from app.schemas.finance import (
    FinanceAlertsResponse,
    FinanceSummaryResponse,
    FinancialRecordCreateRequest,
    FinancialRecordResponse,
    FinancialRecordUpdateRequest,
)
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.services.audit_service import log_action
from app.services.finance_export import export_filename, records_to_csv, records_to_pdf
from app.services.finance_service import (
    RecordFilters,
    create_manual_record,
    current_month_bounds_utc,
    get_finance_alerts,
    get_finance_summary,
    query_records,
    query_records_for_export,
    soft_delete_record,
    update_record,
)

router = APIRouter(prefix="/admin/finance", tags=["admin-finance"])


def _build_filters(
    record_type: str | None,
    source: str | None,
    category: str | None,
    from_date: datetime | None,
    to_date: datetime | None,
    search: str | None,
) -> RecordFilters:
    parsed_type = None
    if record_type:
        try:
            parsed_type = FinancialRecordType(record_type)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid record_type")
    parsed_source = None
    if source:
        try:
            parsed_source = FinancialRecordSource(source)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid source")
    parsed_category = None
    if category:
        try:
            parsed_category = FinancialCategory(category)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
    return RecordFilters(
        record_type=parsed_type,
        source=parsed_source,
        category=parsed_category,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )


def _resolve_period(from_date: datetime | None, to_date: datetime | None) -> tuple[datetime, datetime]:
    if from_date is None and to_date is None:
        return current_month_bounds_utc()
    if from_date is None or to_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both from_date and to_date are required when filtering by period",
        )
    return from_date, to_date


@router.get("/summary", response_model=FinanceSummaryResponse)
def finance_summary(
    _user: FinanceViewUser,
    db: DbSession,
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> FinanceSummaryResponse:
    period_start, period_end = _resolve_period(from_date, to_date)
    return get_finance_summary(db, period_start, period_end)


@router.get("/records", response_model=PaginatedResponse[FinancialRecordResponse])
def list_finance_records(
    _user: FinanceViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    record_type: str | None = Query(default=None),
    source: str | None = Query(default=None),
    category: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
) -> PaginatedResponse[FinancialRecordResponse]:
    filters = _build_filters(record_type, source, category, from_date, to_date, search)
    records, total = query_records(db, filters, page=page, limit=limit)
    items = [FinancialRecordResponse.model_validate(r) for r in records]
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.post("/records", response_model=FinancialRecordResponse, status_code=status.HTTP_201_CREATED)
def create_finance_record(
    payload: FinancialRecordCreateRequest,
    user: FinanceManageUser,
    db: DbSession,
) -> FinancialRecordResponse:
    record = create_manual_record(db, user, payload)
    log_action(
        db,
        actor=user,
        action="finance.record_created",
        resource_type="financial_record",
        resource_id=str(record.id),
        metadata={"record_type": record.record_type.value, "amount_ghs": str(record.amount_ghs)},
    )
    db.commit()
    db.refresh(record)
    return FinancialRecordResponse.model_validate(record)


@router.patch("/records/{record_id}", response_model=FinancialRecordResponse)
def update_finance_record(
    record_id: UUID,
    payload: FinancialRecordUpdateRequest,
    user: FinanceManageUser,
    db: DbSession,
) -> FinancialRecordResponse:
    record = update_record(db, user, record_id, payload)
    log_action(
        db,
        actor=user,
        action="finance.record_updated",
        resource_type="financial_record",
        resource_id=str(record_id),
        metadata=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(record)
    return FinancialRecordResponse.model_validate(record)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finance_record(
    record_id: UUID,
    user: FinanceManageUser,
    db: DbSession,
) -> None:
    soft_delete_record(db, user, record_id)
    log_action(
        db,
        actor=user,
        action="finance.record_deleted",
        resource_type="financial_record",
        resource_id=str(record_id),
    )
    db.commit()


@router.get("/alerts", response_model=FinanceAlertsResponse)
def finance_alerts(_user: FinanceViewUser, db: DbSession) -> FinanceAlertsResponse:
    return get_finance_alerts(db)


@router.get("/export.csv")
def export_finance_csv(
    _user: FinanceViewUser,
    db: DbSession,
    record_type: str | None = Query(default=None),
    source: str | None = Query(default=None),
    category: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
) -> Response:
    period_start, period_end = _resolve_period(from_date, to_date)
    filters = _build_filters(record_type, source, category, period_start, period_end, search)
    records = query_records_for_export(db, filters)
    summary = get_finance_summary(db, period_start, period_end)
    csv_content = records_to_csv(records, summary)
    filename = export_filename("corus-finance", period_start, period_end, "csv")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export.pdf")
def export_finance_pdf(
    _user: FinanceViewUser,
    db: DbSession,
    record_type: str | None = Query(default=None),
    source: str | None = Query(default=None),
    category: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
) -> Response:
    period_start, period_end = _resolve_period(from_date, to_date)
    filters = _build_filters(record_type, source, category, period_start, period_end, search)
    records = query_records_for_export(db, filters)
    summary = get_finance_summary(db, period_start, period_end)
    pdf_bytes = records_to_pdf(records, summary)
    filename = export_filename("corus-finance", period_start, period_end, "pdf")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
