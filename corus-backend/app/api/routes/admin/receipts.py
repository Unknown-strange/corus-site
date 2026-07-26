from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.core.admin_deps import (
    ReceiptsViewUser,
    RentalsManageUser,
    RentalsViewUser,
    ReservationsApproveUser,
    ReservationsViewUser,
)
from app.core.deps import DbSession
from app.models.receipt import Receipt
from app.models.user import User
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.schemas.receipt import ReceiptDetailResponse, ReceiptLineItemResponse, ReceiptSummaryResponse
from app.services.receipt_service import render_receipt_detail, render_receipt_pdf_bytes

router = APIRouter(tags=["admin-receipts"])


def _summary(receipt: Receipt) -> ReceiptSummaryResponse:
    return ReceiptSummaryResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        receipt_type=receipt.receipt_type.value if receipt.receipt_type else None,
        amount_ghs=receipt.amount_ghs,
        issued_at=receipt.issued_at,
    )


def _detail(receipt: Receipt) -> ReceiptDetailResponse:
    rendered = render_receipt_detail(receipt)
    doc = rendered.get("document", {})
    line_items = [ReceiptLineItemResponse.model_validate(item) for item in doc.get("line_items", [])]
    return ReceiptDetailResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        receipt_type=receipt.receipt_type.value if receipt.receipt_type else None,
        amount_ghs=receipt.amount_ghs,
        issued_at=receipt.issued_at,
        line_items=line_items,
        amount_paid_ghs=doc.get("amount_paid_ghs"),
        total_price_ghs=doc.get("total_price_ghs"),
        balance_due_ghs=doc.get("balance_due_ghs"),
        payment_reference=doc.get("payment_reference"),
        customer_name=doc.get("customer_name"),
        customer_email=doc.get("customer_email"),
    )


@router.get("/admin/receipts", response_model=PaginatedResponse[ReceiptSummaryResponse])
def list_receipts_admin(
    _user: ReceiptsViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    receipt_type: str | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> PaginatedResponse[ReceiptSummaryResponse]:
    query = db.query(Receipt).order_by(Receipt.issued_at.desc())
    if receipt_type:
        query = query.filter(Receipt.receipt_type == receipt_type)
    if user_id:
        query = query.filter(Receipt.user_id == user_id)
    if from_date:
        query = query.filter(Receipt.issued_at >= from_date)
    if to_date:
        query = query.filter(Receipt.issued_at <= to_date)

    total = query.count()
    receipts = query.offset((page - 1) * limit).limit(limit).all()
    items = [_summary(r) for r in receipts]
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.get("/admin/receipts/{receipt_id}", response_model=ReceiptDetailResponse)
def get_receipt_admin(
    receipt_id: UUID,
    _user: ReceiptsViewUser,
    db: DbSession,
) -> ReceiptDetailResponse:
    receipt = db.get(Receipt, receipt_id)
    if receipt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return _detail(receipt)


@router.get("/admin/receipts/{receipt_id}/download")
def download_receipt_admin(
    receipt_id: UUID,
    _user: ReceiptsViewUser,
    db: DbSession,
) -> Response:
    receipt = db.get(Receipt, receipt_id)
    if receipt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    pdf_bytes = render_receipt_pdf_bytes(receipt)
    if not pdf_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt PDF unavailable")

    filename = f"{receipt.receipt_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
