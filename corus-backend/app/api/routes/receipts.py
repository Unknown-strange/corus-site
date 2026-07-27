from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.core.deps import CustomerUser, DbSession
from app.models.receipt import Receipt
from app.schemas.receipt import ReceiptDetailResponse, ReceiptLineItemResponse, ReceiptSummaryResponse
from app.services.receipt_service import document_from_summary, render_receipt_pdf_bytes

router = APIRouter(prefix="/receipts", tags=["receipts"])


def _to_detail(receipt: Receipt) -> ReceiptDetailResponse:
    if not receipt.summary_json:
        return ReceiptDetailResponse(
            id=receipt.id,
            receipt_number=receipt.receipt_number,
            receipt_type=receipt.receipt_type.value if receipt.receipt_type else None,
            amount_ghs=receipt.amount_ghs,
            issued_at=receipt.issued_at,
            line_items=[],
        )

    doc = document_from_summary(receipt.summary_json)
    return ReceiptDetailResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        receipt_type=receipt.receipt_type.value if receipt.receipt_type else doc.receipt_type.value,
        amount_ghs=receipt.amount_ghs,
        issued_at=receipt.issued_at,
        line_items=[
            ReceiptLineItemResponse(
                description=item.description,
                quantity=item.quantity,
                unit_price_ghs=item.unit_price_ghs,
                line_total_ghs=item.line_total_ghs,
                detail=item.detail,
            )
            for item in doc.line_items
        ],
        amount_paid_ghs=doc.amount_paid_ghs,
        total_price_ghs=doc.total_price_ghs,
        balance_due_ghs=doc.balance_due_ghs,
        payment_reference=doc.payment_reference,
        customer_name=doc.customer_name,
        customer_email=doc.customer_email,
        customer_phone=doc.customer_phone,
    )


@router.get("/me", response_model=list[ReceiptSummaryResponse])
def my_receipts(user: CustomerUser, db: DbSession) -> list[ReceiptSummaryResponse]:
    receipts = (
        db.query(Receipt)
        .filter(Receipt.user_id == user.id)
        .order_by(Receipt.issued_at.desc())
        .all()
    )
    return [
        ReceiptSummaryResponse(
            id=r.id,
            receipt_number=r.receipt_number,
            receipt_type=r.receipt_type.value if r.receipt_type else None,
            amount_ghs=r.amount_ghs,
            issued_at=r.issued_at,
        )
        for r in receipts
    ]


@router.get("/{receipt_id}", response_model=ReceiptDetailResponse)
def get_receipt(receipt_id: UUID, user: CustomerUser, db: DbSession) -> ReceiptDetailResponse:
    receipt = db.get(Receipt, receipt_id)
    if receipt is None or receipt.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return _to_detail(receipt)


@router.get("/{receipt_id}/download")
def download_receipt(receipt_id: UUID, user: CustomerUser, db: DbSession) -> Response:
    receipt = db.get(Receipt, receipt_id)
    if receipt is None or receipt.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    pdf_bytes = render_receipt_pdf_bytes(receipt)
    if pdf_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation unavailable",
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{receipt.receipt_number}.pdf"'},
    )
