"""Send sample receipt emails for design review."""

import argparse
import sys
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.notification_service import dispatch_email
from app.services.receipt_pdf import receipt_document_to_pdf
from app.services.receipt_templates import (
    ReceiptDocument,
    ReceiptLineItem,
    ReceiptType,
    render_receipt_email,
)


def _sample_documents() -> list[ReceiptDocument]:
    now = datetime.now(UTC)
    return [
        ReceiptDocument(
            receipt_number="RCP-PREVIEW-SESSION-001",
            receipt_type=ReceiptType.session_deposit,
            issued_at=now,
            customer_name="Prince",
            customer_email="princeedwinedwin66@gmail.com",
            line_items=[
                ReceiptLineItem(
                    description="Photoshoot",
                    detail="27 Jul 2026 09:00 – 11:00 UTC",
                    line_total_ghs=Decimal("500.00"),
                ),
                ReceiptLineItem(
                    description="Session deposit (paid online)",
                    line_total_ghs=Decimal("50.00"),
                ),
            ],
            amount_paid_ghs=Decimal("50.00"),
            total_price_ghs=Decimal("500.00"),
            balance_due_ghs=Decimal("450.00"),
            payment_reference="PSK-PREVIEW-SESSION",
            footer_note="Your session is confirmed. Pay the remaining balance at the studio.",
        ),
        ReceiptDocument(
            receipt_number="RCP-PREVIEW-ORDER-001",
            receipt_type=ReceiptType.order_payment,
            issued_at=now,
            customer_name="Prince",
            customer_email="princeedwinedwin66@gmail.com",
            line_items=[
                ReceiptLineItem(
                    description="Rode PodMic",
                    quantity=1,
                    unit_price_ghs=Decimal("350.00"),
                    line_total_ghs=Decimal("350.00"),
                ),
                ReceiptLineItem(
                    description="Studio Headphones",
                    quantity=2,
                    unit_price_ghs=Decimal("120.00"),
                    line_total_ghs=Decimal("240.00"),
                ),
            ],
            amount_paid_ghs=Decimal("590.00"),
            total_price_ghs=Decimal("590.00"),
            payment_reference="PSK-PREVIEW-ORDER",
            footer_note="Your order is confirmed. Pick up your items at the studio when ready.",
        ),
        ReceiptDocument(
            receipt_number="RCP-PREVIEW-RENTAL-001",
            receipt_type=ReceiptType.rental_payment,
            issued_at=now,
            customer_name="Prince",
            customer_email="princeedwinedwin66@gmail.com",
            line_items=[
                ReceiptLineItem(
                    description="Canon EOS R6",
                    quantity=3,
                    unit_price_ghs=Decimal("150.00"),
                    line_total_ghs=Decimal("450.00"),
                    detail="28 Jul 2026 to 31 Jul 2026 · GHS 150.00/day",
                ),
            ],
            amount_paid_ghs=Decimal("450.00"),
            total_price_ghs=Decimal("450.00"),
            payment_reference="PSK-PREVIEW-RENTAL",
            footer_note="Your rental is confirmed. Return equipment by the end date.",
        ),
        ReceiptDocument(
            receipt_number="RCP-PREVIEW-RESERVE-001",
            receipt_type=ReceiptType.reservation_deposit,
            issued_at=now,
            customer_name="Prince",
            customer_email="princeedwinedwin66@gmail.com",
            line_items=[
                ReceiptLineItem(
                    description="Studio reservation",
                    detail="15 Aug 2026 10:00 – 15 Aug 2026 18:00 UTC · Music video shoot",
                    line_total_ghs=Decimal("1000.00"),
                ),
                ReceiptLineItem(
                    description="Reservation deposit (paid online)",
                    line_total_ghs=Decimal("50.00"),
                ),
            ],
            amount_paid_ghs=Decimal("50.00"),
            total_price_ghs=Decimal("1000.00"),
            balance_due_ghs=Decimal("950.00"),
            payment_reference="PSK-PREVIEW-RESERVE",
            footer_note="Your studio reservation is confirmed. Pay the remaining balance at the studio.",
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Send sample receipt emails")
    parser.add_argument("--email", default="princeedwinedwin66@gmail.com")
    parser.add_argument("--force-send", action="store_true", required=True)
    args = parser.parse_args()

    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        for doc in _sample_documents():
            subject, plain, html = render_receipt_email(doc)
            pdf_bytes = receipt_document_to_pdf(doc)
            pdf_attachment = (f"{doc.receipt_number}.pdf", pdf_bytes) if pdf_bytes else None
            ok = dispatch_email(
                db,
                to_email=args.email,
                subject=f"[Preview] {subject}",
                plain_text=plain,
                html=html,
                event_type="receipt_preview",
                force_send=True,
                pdf_attachment=pdf_attachment,
                send_admin_copy=False,
            )
            status = "sent" if ok else "failed"
            print(f"{status}: {doc.type_label} -> {args.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
