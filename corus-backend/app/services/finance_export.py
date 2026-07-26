"""CSV and PDF export for the financial ledger."""

from __future__ import annotations

import csv
from datetime import UTC, datetime
from io import BytesIO, StringIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.financial_record import FinancialRecord
from app.schemas.finance import FinanceSummaryResponse
from app.services.receipt_templates import ACCENT, INK, INK_MUTED, STUDIO_NAME

ACCENT_RL = colors.HexColor(ACCENT)
INK_RL = colors.HexColor(INK)
INK_MUTED_RL = colors.HexColor(INK_MUTED)
BORDER_RL = colors.HexColor("#D9D9D9")


def _fmt_money(value) -> str:
    return f"GHS {value:,.2f}"


def _fmt_date(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.strftime("%d %b %Y")


def records_to_csv(
    records: list[FinancialRecord],
    summary: FinanceSummaryResponse,
) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Date",
            "Type",
            "Source",
            "Category",
            "Source Label",
            "Description",
            "Amount (GHS)",
        ]
    )
    for record in records:
        writer.writerow(
            [
                _fmt_date(record.record_date),
                record.record_type.value,
                record.source.value,
                record.category.value,
                record.source_label or "",
                record.description or "",
                f"{record.amount_ghs:.2f}",
            ]
        )
    writer.writerow([])
    writer.writerow(["Total Income", "", "", "", "", "", f"{summary.total_income_ghs:.2f}"])
    writer.writerow(["Total Expenses", "", "", "", "", "", f"{summary.total_expenses_ghs:.2f}"])
    writer.writerow(["Profit", "", "", "", "", "", f"{summary.profit_ghs:.2f}"])
    return buffer.getvalue()


def records_to_pdf(
    records: list[FinancialRecord],
    summary: FinanceSummaryResponse,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "title",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=INK_RL,
    )
    subtitle_style = ParagraphStyle(
        "subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=INK_MUTED_RL,
    )

    period_label = f"{_fmt_date(summary.period_start)} – {_fmt_date(summary.period_end)}"
    story = [
        Paragraph(STUDIO_NAME, title_style),
        Paragraph("Financial Report", title_style),
        Paragraph(period_label, subtitle_style),
        Spacer(1, 8),
    ]

    summary_data = [
        ["Total Income", _fmt_money(summary.total_income_ghs)],
        ["Total Expenses", _fmt_money(summary.total_expenses_ghs)],
        ["Profit", _fmt_money(summary.profit_ghs)],
        ["Records", str(summary.record_count)],
    ]
    summary_table = Table(summary_data, colWidths=[80 * mm, 60 * mm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT_RL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_RL),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ]
        )
    )
    story.extend([summary_table, Spacer(1, 12)])

    table_data = [
        ["Date", "Type", "Source", "Category", "Label", "Description", "Amount"],
    ]
    for record in records:
        table_data.append(
            [
                _fmt_date(record.record_date),
                record.record_type.value,
                record.source.value,
                record.category.value,
                (record.source_label or "")[:40],
                (record.description or "")[:50],
                _fmt_money(record.amount_ghs),
            ]
        )

    col_widths = [28 * mm, 18 * mm, 18 * mm, 32 * mm, 40 * mm, 55 * mm, 28 * mm]
    data_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    data_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT_RL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.25, BORDER_RL),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(data_table)

    generated = ParagraphStyle(
        "generated",
        parent=styles["Normal"],
        fontSize=8,
        textColor=INK_MUTED_RL,
        alignment=TA_CENTER,
    )
    story.extend(
        [
            Spacer(1, 10),
            Paragraph(
                f"Generated {datetime.now(UTC).strftime('%d %b %Y %H:%M UTC')}",
                generated,
            ),
        ]
    )

    doc.build(story)
    return buffer.getvalue()


def export_filename(prefix: str, from_date: datetime, to_date: datetime, ext: str) -> str:
    start = from_date.strftime("%Y%m%d")
    end = to_date.strftime("%Y%m%d")
    return f"{prefix}-{start}-{end}.{ext}"
