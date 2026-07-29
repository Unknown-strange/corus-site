"""Generate PDF receipts — ReportLab for reliable brand colors on Windows."""

import logging
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.receipt_templates import (
    ACCENT,
    INK,
    INK_MUTED,
    INK_SOFT,
    STUDIO_ADDRESS,
    STUDIO_EMAIL,
    STUDIO_NAME,
    STUDIO_PHONE,
    ReceiptDocument,
    _format_date,
    _format_datetime,
    _format_money,
)

logger = logging.getLogger(__name__)

_weasyprint_available: bool | None = None
_xhtml2pdf_available: bool | None = None

ACCENT_RL = colors.HexColor(ACCENT)
INK_RL = colors.HexColor(INK)
INK_SOFT_RL = colors.HexColor(INK_SOFT)
INK_MUTED_RL = colors.HexColor(INK_MUTED)
BORDER_RL = colors.HexColor("#D9D9D9")
WHITE = colors.white

# Spacing/sizing aligned with render_receipt_body_html (640px email card → A4 content)
PX = 0.75  # CSS px → PDF points
PAD_X = 32 * PX
PAD_TOP = 28 * PX
PAD_BOTTOM = 20 * PX
SECTION_GAP = 28 * PX
ITEM_PAD_Y = 14 * PX
ITEM_PAD_X = 12 * PX
HEADER_PAD = 12 * PX
NOTES_PAD_Y = 20 * PX
NOTES_PAD_BOTTOM = 28 * PX
FOOTER_PAD_Y = 16 * PX
FOOTER_PAD_BOTTOM = 28 * PX
THANK_PAD_Y = 20 * PX


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "studio": ParagraphStyle(
            "studio",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22 * PX,
            textColor=INK_RL,
            leading=24 * PX,
        ),
        "type_label": ParagraphStyle(
            "type_label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11 * PX,
            textColor=ACCENT_RL,
            leading=14 * PX,
            spaceBefore=4 * PX,
        ),
        "receipt_title": ParagraphStyle(
            "receipt_title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28 * PX,
            textColor=ACCENT_RL,
            alignment=TA_RIGHT,
            leading=30 * PX,
        ),
        "meta_right": ParagraphStyle(
            "meta_right",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12 * PX,
            textColor=INK_SOFT_RL,
            alignment=TA_RIGHT,
            leading=15 * PX,
            spaceBefore=6 * PX,
        ),
        "meta_muted": ParagraphStyle(
            "meta_muted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11 * PX,
            textColor=INK_MUTED_RL,
            alignment=TA_RIGHT,
            leading=14 * PX,
            spaceBefore=4 * PX,
        ),
        "label": ParagraphStyle(
            "label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11 * PX,
            textColor=INK_RL,
            leading=14 * PX,
            spaceAfter=8 * PX,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11 * PX,
            textColor=INK_SOFT_RL,
            leading=15 * PX,
        ),
        "item_title": ParagraphStyle(
            "item_title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13 * PX,
            textColor=INK_RL,
            leading=16 * PX,
        ),
        "item_detail": ParagraphStyle(
            "item_detail",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11 * PX,
            textColor=INK_MUTED_RL,
            leading=14 * PX,
            spaceBefore=6 * PX,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12 * PX,
            textColor=INK_SOFT_RL,
            leading=15 * PX,
        ),
        "cell_bold": ParagraphStyle(
            "cell_bold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12 * PX,
            textColor=INK_RL,
            leading=15 * PX,
        ),
        "note": ParagraphStyle(
            "note",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11 * PX,
            textColor=INK_MUTED_RL,
            leading=15 * PX,
        ),
        "note_label": ParagraphStyle(
            "note_label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11 * PX,
            textColor=INK_RL,
            leading=14 * PX,
            spaceAfter=8 * PX,
        ),
        "thank_you": ParagraphStyle(
            "thank_you",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13 * PX,
            textColor=ACCENT_RL,
            alignment=TA_CENTER,
            leading=16 * PX,
        ),
        "footer_body": ParagraphStyle(
            "footer_body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10 * PX,
            textColor=INK_MUTED_RL,
            leading=13 * PX,
        ),
    }


def receipt_document_to_pdf(doc: ReceiptDocument) -> bytes | None:
    """Render receipt PDF with spacing and typography matching the email receipt card."""
    try:
        styles = _styles()
        buffer = BytesIO()
        pdf = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
        )
        content_width = pdf.width
        inner_width = content_width - (2 * PAD_X)

        ref_bits = doc.receipt_number
        if doc.payment_reference:
            ref_bits += f"<br/>Ref: {doc.payment_reference}"

        header = Table(
            [
                [
                    Paragraph(
                        f"{STUDIO_NAME}<br/><font color='{ACCENT}' size='{int(11 * PX)}'><b>{doc.type_label.upper()}</b></font>",
                        styles["studio"],
                    ),
                    Paragraph(
                        f"RECEIPT<br/><font color='{INK_SOFT}' size='{int(12 * PX)}'>{_format_date(doc.issued_at)}</font>"
                        f"<br/><font color='{INK_MUTED}' size='{int(11 * PX)}'>{ref_bits}</font>",
                        styles["receipt_title"],
                    ),
                ],
            ],
            colWidths=[inner_width * 0.5, inner_width * 0.5],
        )
        header.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        customer = doc.customer_name or "Customer"
        if doc.customer_email:
            customer += f"<br/><font color='{INK_MUTED}' size='{int(11 * PX)}'>{doc.customer_email}</font>"
        if doc.customer_phone:
            customer += f"<br/><font color='{INK_MUTED}' size='{int(11 * PX)}'>{doc.customer_phone}</font>"

        addresses = Table(
            [
                [
                    Paragraph("Studio Address", styles["label"]),
                    Paragraph("To :", styles["label"]),
                ],
                [
                    Paragraph(
                        f"{STUDIO_NAME}<br/>{STUDIO_ADDRESS}<br/>{STUDIO_PHONE}",
                        styles["body"],
                    ),
                    Paragraph(customer, styles["body"]),
                ],
            ],
            colWidths=[inner_width * 0.5, inner_width * 0.5],
        )
        addresses.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (0, -1), 0),
                    ("RIGHTPADDING", (0, 0), (0, -1), 16 * PX),
                    ("LEFTPADDING", (1, 0), (1, -1), 16 * PX),
                    ("RIGHTPADDING", (1, 0), (1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        item_rows: list[list] = [["Items Description", "Unit Price", "Qnt", "Total"]]
        for item in doc.line_items:
            qty = str(item.quantity) if item.unit_price_ghs is not None else "1"
            unit = _format_money(item.unit_price_ghs) if item.unit_price_ghs is not None else "—"
            total = _format_money(item.line_total_ghs) if item.line_total_ghs is not None else "—"
            desc_text = item.description
            if item.detail:
                desc_text += f"<br/><font color='{INK_MUTED}' size='{int(11 * PX)}'>{item.detail}</font>"
            item_rows.append(
                [
                    Paragraph(desc_text, styles["item_title"]),
                    Paragraph(unit, styles["cell"]),
                    Paragraph(qty, styles["cell"]),
                    Paragraph(total, styles["cell_bold"]),
                ]
            )

        col_desc = content_width * 0.46
        col_unit = content_width * 0.18
        col_qty = content_width * 0.12
        col_total = content_width * 0.24
        items_table = Table(
            item_rows,
            colWidths=[col_desc, col_unit, col_qty, col_total],
            repeatRows=1,
        )
        items_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), ACCENT_RL),
                    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11 * PX),
                    ("ALIGN", (0, 0), (0, 0), "LEFT"),
                    ("ALIGN", (1, 0), (2, 0), "CENTER"),
                    ("ALIGN", (3, 0), (3, 0), "RIGHT"),
                    ("ALIGN", (1, 1), (2, -1), "CENTER"),
                    ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, BORDER_RL),
                    ("LEFTPADDING", (0, 0), (-1, -1), ITEM_PAD_X),
                    ("RIGHTPADDING", (0, 0), (-1, -1), ITEM_PAD_X),
                    ("TOPPADDING", (0, 0), (-1, 0), HEADER_PAD),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), HEADER_PAD),
                    ("TOPPADDING", (0, 1), (-1, -1), ITEM_PAD_Y),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), ITEM_PAD_Y),
                ]
            )
        )

        subtotal = doc.total_price_ghs
        if subtotal is None and doc.line_items:
            from decimal import Decimal

            subtotal = sum(
                (item.line_total_ghs for item in doc.line_items if item.line_total_ghs is not None),
                Decimal("0"),
            )

        totals_rows: list[list] = []
        if subtotal is not None and subtotal != doc.amount_paid_ghs:
            totals_rows.append(["SUBTOTAL :", _format_money(subtotal)])
        if doc.balance_due_ghs is not None and doc.balance_due_ghs > 0:
            totals_rows.append(["BALANCE DUE AT STUDIO :", _format_money(doc.balance_due_ghs)])

        amount_row = len(totals_rows)
        totals_rows.append([f"AMOUNT PAID : {_format_money(doc.amount_paid_ghs)}", ""])

        right_width = inner_width * 0.45
        totals_col_a = right_width * 0.58
        totals_col_b = right_width * 0.42
        totals_table = Table(totals_rows, colWidths=[totals_col_a, totals_col_b])
        totals_style: list = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, amount_row - 1), 6 * PX),
            ("BOTTOMPADDING", (0, 0), (-1, amount_row - 1), 6 * PX),
            ("SPAN", (0, amount_row), (1, amount_row)),
            ("BACKGROUND", (0, amount_row), (1, amount_row), ACCENT_RL),
            ("TEXTCOLOR", (0, amount_row), (1, amount_row), WHITE),
            ("FONTNAME", (0, amount_row), (1, amount_row), "Helvetica-Bold"),
            ("FONTSIZE", (0, amount_row), (1, amount_row), 13 * PX),
            ("ALIGN", (0, amount_row), (1, amount_row), "RIGHT"),
            ("TOPPADDING", (0, amount_row), (1, amount_row), 14 * PX),
            ("BOTTOMPADDING", (0, amount_row), (1, amount_row), 12 * PX),
            ("RIGHTPADDING", (0, amount_row), (1, amount_row), 16 * PX),
        ]
        if amount_row > 0:
            totals_style.extend(
                [
                    ("ALIGN", (0, 0), (0, amount_row - 1), "RIGHT"),
                    ("ALIGN", (1, 0), (1, amount_row - 1), "RIGHT"),
                    ("FONTNAME", (0, 0), (-1, amount_row - 1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, amount_row - 1), 12 * PX),
                    ("TEXTCOLOR", (0, 0), (0, amount_row - 1), INK_MUTED_RL),
                    ("TEXTCOLOR", (1, 0), (1, amount_row - 1), INK_RL),
                    ("FONTNAME", (1, 0), (1, amount_row - 1), "Helvetica-Bold"),
                ]
            )
        totals_table.setStyle(TableStyle(totals_style))

        notes_totals = Table(
            [
                [
                    Paragraph(f"<b>Note :</b><br/>{doc.footer_note}", styles["note"]),
                    totals_table,
                ]
            ],
            colWidths=[inner_width * 0.55, right_width],
        )
        notes_totals.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 24 * PX),
                    ("LEFTPADDING", (1, 0), (1, 0), 0),
                    ("RIGHTPADDING", (1, 0), (1, 0), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        footer = Table(
            [
                [
                    Paragraph(
                        f"<b>Questions?</b><br/>Email us : {STUDIO_EMAIL}<br/>Call us : {STUDIO_PHONE}",
                        styles["footer_body"],
                    ),
                    Paragraph(
                        f"<b>Payment Info</b><br/>Method : Paystack<br/>Currency : GHS<br/>"
                        f"Issued : {_format_datetime(doc.issued_at)}",
                        styles["footer_body"],
                    ),
                    Paragraph(
                        "<b>Terms &amp; Conditions</b><br/>This receipt confirms payment received. "
                        "Balances and pickups are handled at the studio.",
                        styles["footer_body"],
                    ),
                ]
            ],
            colWidths=[inner_width / 3] * 3,
        )
        footer.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (0, 0), 0),
                    ("RIGHTPADDING", (0, 0), (0, 0), 12 * PX),
                    ("LEFTPADDING", (1, 0), (1, 0), 6 * PX),
                    ("RIGHTPADDING", (1, 0), (1, 0), 6 * PX),
                    ("LEFTPADDING", (2, 0), (2, 0), 12 * PX),
                    ("RIGHTPADDING", (2, 0), (2, 0), 0),
                    ("LINEABOVE", (0, 0), (-1, -1), 0.5, BORDER_RL),
                    ("TOPPADDING", (0, 0), (-1, -1), FOOTER_PAD_Y),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        thank_you_block = Table(
            [[Paragraph("Thank you for your business", styles["thank_you"])]],
            colWidths=[inner_width],
        )
        thank_you_block.setStyle(
            TableStyle(
                [
                    ("LINEABOVE", (0, 0), (-1, -1), 0.5, BORDER_RL),
                    ("TOPPADDING", (0, 0), (-1, -1), THANK_PAD_Y),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8 * PX),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        card_rows = [
            [header],
            [Spacer(1, SECTION_GAP)],
            [addresses],
            [Spacer(1, SECTION_GAP)],
        ]
        card_inner = Table(card_rows, colWidths=[inner_width])
        card_inner.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )

        notes_block = Table(
            [[notes_totals], [Spacer(1, NOTES_PAD_BOTTOM - NOTES_PAD_Y)], [thank_you_block], [footer]],
            colWidths=[inner_width],
        )
        notes_block.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )

        accent_bar = Table([[""]], colWidths=[content_width], rowHeights=[4 * PX])
        accent_bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT_RL)]))

        # Items table spans full card width (matches email — table is not inset)
        items_table_full = Table([[items_table]], colWidths=[content_width])
        items_table_full.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        card = Table(
            [
                [accent_bar],
                [card_inner],
                [items_table_full],
                [Spacer(1, NOTES_PAD_Y)],
                [notes_block],
            ],
            colWidths=[content_width],
        )
        card.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, BORDER_RL),
                    ("LEFTPADDING", (0, 1), (0, 1), PAD_X),
                    ("RIGHTPADDING", (0, 1), (0, 1), PAD_X),
                    ("TOPPADDING", (0, 1), (0, 1), PAD_TOP),
                    ("BOTTOMPADDING", (0, 1), (0, 1), PAD_BOTTOM),
                    ("LEFTPADDING", (0, 4), (0, 4), PAD_X),
                    ("RIGHTPADDING", (0, 4), (0, 4), PAD_X),
                    ("BOTTOMPADDING", (0, 4), (0, 4), FOOTER_PAD_BOTTOM),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )

        pdf.build([card])
        return buffer.getvalue()
    except Exception:
        logger.exception("ReportLab receipt PDF generation failed")
        return None


def _check_weasyprint() -> bool:
    global _weasyprint_available
    if _weasyprint_available is not None:
        return _weasyprint_available
    try:
        import weasyprint  # noqa: F401

        _weasyprint_available = True
    except Exception:
        _weasyprint_available = False
    return _weasyprint_available


def _check_xhtml2pdf() -> bool:
    global _xhtml2pdf_available
    if _xhtml2pdf_available is not None:
        return _xhtml2pdf_available
    try:
        import xhtml2pdf  # noqa: F401

        _xhtml2pdf_available = True
    except Exception:
        _xhtml2pdf_available = False
    return _xhtml2pdf_available


def _pdf_via_weasyprint(html: str) -> bytes | None:
    try:
        from weasyprint import HTML

        return HTML(string=html).write_pdf()
    except Exception:
        logger.exception("WeasyPrint PDF generation failed")
        return None


def _pdf_via_xhtml2pdf(html: str) -> bytes | None:
    try:
        from xhtml2pdf import pisa

        buffer = BytesIO()
        status = pisa.CreatePDF(html, dest=buffer, encoding="utf-8")
        if status.err:
            logger.warning("xhtml2pdf reported errors during PDF generation")
            return None
        return buffer.getvalue()
    except Exception:
        logger.exception("xhtml2pdf PDF generation failed")
        return None


def html_to_pdf(html: str) -> bytes | None:
    if _check_weasyprint():
        pdf = _pdf_via_weasyprint(html)
        if pdf:
            return pdf

    if _check_xhtml2pdf():
        return _pdf_via_xhtml2pdf(html)

    logger.warning("No PDF engine available — install weasyprint or xhtml2pdf")
    return None
