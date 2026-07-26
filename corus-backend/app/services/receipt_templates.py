"""Unified receipt documents — branded invoice layout."""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum

# Brand + neutral palette
ACCENT = "#FF5100"
INK = "#111111"
INK_SOFT = "#444444"
INK_MUTED = "#777777"
BORDER = "#D9D9D9"
BG = "#FFFFFF"
BG_SOFT = "#F5F5F5"
HEADER_BG = ACCENT
HEADER_FG = "#FFFFFF"

STUDIO_NAME = "Corus Studios"
STUDIO_ADDRESS = "Accra, Ghana"
STUDIO_PHONE = "+233 XX XXX XXXX"
STUDIO_EMAIL = "hello@corusstudios.com"


class ReceiptType(str, Enum):
    session_deposit = "session_deposit"
    order_payment = "order_payment"
    rental_payment = "rental_payment"
    reservation_deposit = "reservation_deposit"


RECEIPT_TYPE_LABELS = {
    ReceiptType.session_deposit: "Session Booking",
    ReceiptType.order_payment: "Shop Order",
    ReceiptType.rental_payment: "Equipment Rental",
    ReceiptType.reservation_deposit: "Studio Reservation",
}


@dataclass
class ReceiptLineItem:
    description: str
    quantity: int = 1
    unit_price_ghs: Decimal | None = None
    line_total_ghs: Decimal | None = None
    detail: str | None = None


DEFAULT_FOOTER = (
    "Payment confirms your booking or order. Remaining balances, if any, are payable at the studio. "
    "Please bring this receipt when picking up items or attending your session."
)


@dataclass
class ReceiptDocument:
    receipt_number: str
    receipt_type: ReceiptType
    issued_at: datetime
    customer_name: str | None
    customer_email: str | None
    line_items: list[ReceiptLineItem] = field(default_factory=list)
    amount_paid_ghs: Decimal = Decimal("0")
    total_price_ghs: Decimal | None = None
    balance_due_ghs: Decimal | None = None
    payment_reference: str | None = None
    footer_note: str = DEFAULT_FOOTER

    @property
    def type_label(self) -> str:
        return RECEIPT_TYPE_LABELS[self.receipt_type]


def _format_money(value: Decimal | None) -> str:
    if value is None:
        return "—"
    return f"GHS {value:,.2f}"


def _format_date(value: datetime) -> str:
    return value.strftime("%B %d, %Y")


def _format_datetime(value: datetime) -> str:
    return value.strftime("%B %d, %Y · %H:%M UTC")


def _item_rows(doc: ReceiptDocument) -> str:
    rows = ""
    for item in doc.line_items:
        qty = str(item.quantity) if item.unit_price_ghs is not None else "1"
        unit = _format_money(item.unit_price_ghs) if item.unit_price_ghs is not None else "—"
        total = _format_money(item.line_total_ghs) if item.line_total_ghs is not None else "—"
        detail_html = ""
        if item.detail:
            detail_html = f'<div style="margin-top:6px;font-size:11px;line-height:1.5;color:{INK_MUTED};">{item.detail}</div>'
        rows += f"""
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid {BORDER};vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:{INK};">{item.description}</div>
            {detail_html}
          </td>
          <td style="padding:14px 8px;border-bottom:1px solid {BORDER};text-align:center;font-size:12px;color:{INK_SOFT};">{unit}</td>
          <td style="padding:14px 8px;border-bottom:1px solid {BORDER};text-align:center;font-size:12px;color:{INK_SOFT};">{qty}</td>
          <td style="padding:14px 12px;border-bottom:1px solid {BORDER};text-align:right;font-size:12px;font-weight:700;color:{INK};">{total}</td>
        </tr>"""
    return rows


def _totals_block(doc: ReceiptDocument) -> str:
    rows = ""
    subtotal = doc.total_price_ghs
    if subtotal is None and doc.line_items:
        subtotal = sum(
            (item.line_total_ghs for item in doc.line_items if item.line_total_ghs is not None),
            Decimal("0"),
        )

    if subtotal is not None and subtotal != doc.amount_paid_ghs:
        rows += f"""
        <tr>
          <td style="padding:6px 0;font-size:12px;color:{INK_MUTED};text-align:right;letter-spacing:0.5px;">SUBTOTAL :</td>
          <td style="padding:6px 0 6px 16px;font-size:12px;color:{INK};text-align:right;width:120px;">{_format_money(subtotal)}</td>
        </tr>"""

    if doc.balance_due_ghs is not None and doc.balance_due_ghs > 0:
        rows += f"""
        <tr>
          <td style="padding:6px 0;font-size:12px;color:{INK_MUTED};text-align:right;letter-spacing:0.5px;">BALANCE DUE AT STUDIO :</td>
          <td style="padding:6px 0 6px 16px;font-size:12px;color:{INK};text-align:right;">{_format_money(doc.balance_due_ghs)}</td>
        </tr>"""

    rows += f"""
        <tr>
          <td colspan="2" style="padding:14px 0 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td bgcolor="{ACCENT}" style="background-color:{ACCENT};color:{HEADER_FG};padding:12px 16px;text-align:right;font-size:13px;font-weight:700;letter-spacing:0.5px;">
                  AMOUNT PAID : {_format_money(doc.amount_paid_ghs)}
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
    return rows


def render_receipt_body_html(doc: ReceiptDocument) -> str:
    customer_name = doc.customer_name or "Customer"
    customer_email = doc.customer_email or ""
    customer_block = customer_name
    if customer_email:
        customer_block += f"<br/><span style='color:{INK_MUTED};font-size:11px;'>{customer_email}</span>"

    ref_line = ""
    if doc.payment_reference:
        ref_line = f"<br/>Ref: {doc.payment_reference}"

    return f"""
    <div style="background:{BG};border:1px solid {BORDER};font-family:Arial,Helvetica,sans-serif;color:{INK};">
      <div style="height:4px;background-color:{ACCENT};font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding:28px 32px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:top;width:50%;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:{INK};">{STUDIO_NAME}</div>
              <div style="margin-top:4px;font-size:11px;color:{ACCENT};text-transform:uppercase;letter-spacing:1px;font-weight:600;">{doc.type_label}</div>
            </td>
            <td style="vertical-align:top;text-align:right;width:50%;">
              <div style="font-size:28px;font-weight:700;letter-spacing:2px;color:{ACCENT};">RECEIPT</div>
              <div style="margin-top:6px;font-size:12px;color:{INK_SOFT};">{_format_date(doc.issued_at)}</div>
              <div style="margin-top:4px;font-size:11px;color:{INK_MUTED};">{doc.receipt_number}{ref_line}</div>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
          <tr>
            <td style="vertical-align:top;width:50%;padding-right:16px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:8px;">Studio Address</div>
              <div style="font-size:11px;line-height:1.7;color:{INK_SOFT};">
                {STUDIO_NAME}<br/>
                {STUDIO_ADDRESS}<br/>
                {STUDIO_PHONE}
              </div>
            </td>
            <td style="vertical-align:top;width:50%;padding-left:16px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:8px;">To :</div>
              <div style="font-size:11px;line-height:1.7;color:{INK_SOFT};">{customer_block}</div>
            </td>
          </tr>
        </table>
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background-color:{ACCENT};">
            <th bgcolor="{ACCENT}" style="background-color:{ACCENT};padding:12px;text-align:left;font-size:11px;font-weight:700;color:{HEADER_FG};letter-spacing:0.5px;">Items Description</th>
            <th bgcolor="{ACCENT}" style="background-color:{ACCENT};padding:12px 8px;text-align:center;font-size:11px;font-weight:700;color:{HEADER_FG};width:90px;">Unit Price</th>
            <th bgcolor="{ACCENT}" style="background-color:{ACCENT};padding:12px 8px;text-align:center;font-size:11px;font-weight:700;color:{HEADER_FG};width:50px;">Qnt</th>
            <th bgcolor="{ACCENT}" style="background-color:{ACCENT};padding:12px;text-align:right;font-size:11px;font-weight:700;color:{HEADER_FG};width:100px;">Total</th>
          </tr>
        </thead>
        <tbody>{_item_rows(doc)}</tbody>
      </table>

      <div style="padding:20px 32px 28px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:top;width:55%;padding-right:24px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:8px;">Note :</div>
              <div style="font-size:11px;line-height:1.7;color:{INK_MUTED};">{doc.footer_note}</div>
            </td>
            <td style="vertical-align:top;width:45%;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                {_totals_block(doc)}
              </table>
            </td>
          </tr>
        </table>
      </div>

      <div style="border-top:1px solid {BORDER};padding:20px 32px 8px;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:{ACCENT};letter-spacing:0.3px;">Thank you for your business</div>
      </div>

      <div style="padding:16px 32px 28px;border-top:1px solid {BORDER};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:top;width:33%;padding-right:12px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:6px;">Questions?</div>
              <div style="font-size:10px;line-height:1.7;color:{INK_MUTED};">
                Email us : {STUDIO_EMAIL}<br/>
                Call us : {STUDIO_PHONE}
              </div>
            </td>
            <td style="vertical-align:top;width:34%;padding:0 6px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:6px;">Payment Info</div>
              <div style="font-size:10px;line-height:1.7;color:{INK_MUTED};">
                Method : Paystack<br/>
                Currency : GHS<br/>
                Issued : {_format_datetime(doc.issued_at)}
              </div>
            </td>
            <td style="vertical-align:top;width:33%;padding-left:12px;">
              <div style="font-size:11px;font-weight:700;color:{INK};margin-bottom:6px;">Terms &amp; Conditions</div>
              <div style="font-size:10px;line-height:1.7;color:{INK_MUTED};">
                This receipt confirms payment received. Balances and pickups are handled at the studio.
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>"""


def _pdf_item_rows(doc: ReceiptDocument) -> str:
    rows = ""
    for item in doc.line_items:
        qty = str(item.quantity) if item.unit_price_ghs is not None else "1"
        unit = _format_money(item.unit_price_ghs) if item.unit_price_ghs is not None else "—"
        total = _format_money(item.line_total_ghs) if item.line_total_ghs is not None else "—"
        detail_html = ""
        if item.detail:
            detail_html = f'<br/><span style="font-size:9px;color:{INK_MUTED};">{item.detail}</span>'
        rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid {BORDER};vertical-align:top;">
            <b>{item.description}</b>{detail_html}
          </td>
          <td style="padding:10px 6px;border-bottom:1px solid {BORDER};text-align:center;color:{INK_SOFT};">{unit}</td>
          <td style="padding:10px 6px;border-bottom:1px solid {BORDER};text-align:center;color:{INK_SOFT};">{qty}</td>
          <td style="padding:10px 8px;border-bottom:1px solid {BORDER};text-align:right;"><b>{total}</b></td>
        </tr>"""
    return rows


def _pdf_totals_rows(doc: ReceiptDocument) -> str:
    rows = ""
    subtotal = doc.total_price_ghs
    if subtotal is None and doc.line_items:
        subtotal = sum(
            (item.line_total_ghs for item in doc.line_items if item.line_total_ghs is not None),
            Decimal("0"),
        )

    if subtotal is not None and subtotal != doc.amount_paid_ghs:
        rows += f"""
        <tr>
          <td style="padding:4px 0;text-align:right;color:{INK_MUTED};font-size:10px;">SUBTOTAL :</td>
          <td style="padding:4px 0 4px 12px;text-align:right;width:110px;font-size:10px;">{_format_money(subtotal)}</td>
        </tr>"""

    if doc.balance_due_ghs is not None and doc.balance_due_ghs > 0:
        rows += f"""
        <tr>
          <td style="padding:4px 0;text-align:right;color:{INK_MUTED};font-size:10px;">BALANCE DUE AT STUDIO :</td>
          <td style="padding:4px 0 4px 12px;text-align:right;font-size:10px;">{_format_money(doc.balance_due_ghs)}</td>
        </tr>"""

    rows += f"""
        <tr>
          <td colspan="2" style="padding:10px 0 0;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td bgcolor="{ACCENT}" align="right" style="background-color:{ACCENT};padding:10px 12px;color:{HEADER_FG};font-size:11px;">
                  <b>AMOUNT PAID : {_format_money(doc.amount_paid_ghs)}</b>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
    return rows


def render_receipt_pdf_html(doc: ReceiptDocument) -> str:
    """PDF-optimized HTML — same branded invoice layout as the email receipt card."""
    customer_name = doc.customer_name or "Customer"
    customer_email = doc.customer_email or ""
    customer_lines = customer_name
    if customer_email:
        customer_lines += f'<br/><span style="color:{INK_MUTED};font-size:9px;">{customer_email}</span>'

    ref_line = ""
    if doc.payment_reference:
        ref_line = f"<br/>Ref: {doc.payment_reference}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt {doc.receipt_number}</title>
  <style>
    @page {{ size: a4; margin: 14mm; }}
    body {{ margin: 0; padding: 0; background: {BG}; font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: {INK}; }}
    table {{ border-collapse: collapse; }}
    a, a:visited {{ color: {INK_SOFT}; text-decoration: none; }}
    .accent-bar {{ background-color: {ACCENT}; color: {HEADER_FG}; }}
  </style>
</head>
<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="1" bordercolor="{BORDER}">
    <tr>
      <td bgcolor="{ACCENT}" style="height:4px;font-size:0;line-height:0;padding:0;border:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:22px 24px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="50%" valign="top">
              <span style="font-size:18px;font-weight:bold;color:{INK};">{STUDIO_NAME}</span><br/>
              <span style="font-size:9px;color:{ACCENT};text-transform:uppercase;font-weight:bold;">{doc.type_label}</span>
            </td>
            <td width="50%" valign="top" align="right">
              <span style="font-size:22px;font-weight:bold;color:{ACCENT};">RECEIPT</span><br/>
              <span style="font-size:10px;color:{INK_SOFT};">{_format_date(doc.issued_at)}</span><br/>
              <span style="font-size:9px;color:{INK_MUTED};">{doc.receipt_number}{ref_line}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="50%" valign="top" style="padding-right:12px;">
              <span style="font-size:9px;font-weight:bold;">Studio Address</span><br/>
              <span style="font-size:9px;line-height:1.6;color:{INK_SOFT};">
                {STUDIO_NAME}<br/>{STUDIO_ADDRESS}<br/>{STUDIO_PHONE}
              </span>
            </td>
            <td width="50%" valign="top" style="padding-left:12px;">
              <span style="font-size:9px;font-weight:bold;">To :</span><br/>
              <span style="font-size:9px;line-height:1.6;color:{INK_SOFT};">{customer_lines}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <th bgcolor="{ACCENT}" align="left" style="background-color:{ACCENT};padding:10px 8px;color:{HEADER_FG};font-size:9px;">Items Description</th>
            <th bgcolor="{ACCENT}" align="center" style="background-color:{ACCENT};padding:10px 6px;color:{HEADER_FG};font-size:9px;width:80px;">Unit Price</th>
            <th bgcolor="{ACCENT}" align="center" style="background-color:{ACCENT};padding:10px 6px;color:{HEADER_FG};font-size:9px;width:40px;">Qnt</th>
            <th bgcolor="{ACCENT}" align="right" style="background-color:{ACCENT};padding:10px 8px;color:{HEADER_FG};font-size:9px;width:90px;">Total</th>
          </tr>
          {_pdf_item_rows(doc)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px 20px;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="55%" valign="top" style="padding-right:16px;">
              <span style="font-size:9px;font-weight:bold;">Note :</span><br/>
              <span style="font-size:9px;line-height:1.6;color:{INK_MUTED};">{doc.footer_note}</span>
            </td>
            <td width="45%" valign="top">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                {_pdf_totals_rows(doc)}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px 8px;border-top:1px solid {BORDER};" align="center">
        <b style="font-size:11px;color:{ACCENT};">Thank you for your business</b>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 24px 18px;border-top:1px solid {BORDER};">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="33%" valign="top" style="padding-right:8px;">
              <span style="font-size:9px;font-weight:bold;">Questions?</span><br/>
              <span style="font-size:8px;line-height:1.6;color:{INK_MUTED};">
                Email us : {STUDIO_EMAIL}<br/>Call us : {STUDIO_PHONE}
              </span>
            </td>
            <td width="34%" valign="top" style="padding:0 4px;">
              <span style="font-size:9px;font-weight:bold;">Payment Info</span><br/>
              <span style="font-size:8px;line-height:1.6;color:{INK_MUTED};">
                Method : Paystack<br/>Currency : GHS<br/>Issued : {_format_datetime(doc.issued_at)}
              </span>
            </td>
            <td width="33%" valign="top" style="padding-left:8px;">
              <span style="font-size:9px;font-weight:bold;">Terms &amp; Conditions</span><br/>
              <span style="font-size:8px;line-height:1.6;color:{INK_MUTED};">
                This receipt confirms payment received. Balances and pickups are handled at the studio.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def render_receipt_html(doc: ReceiptDocument, *, standalone: bool = False) -> str:
    if standalone:
        return render_receipt_pdf_html(doc)
    return render_receipt_body_html(doc)


def render_receipt_plain(doc: ReceiptDocument) -> str:
    lines = [
        STUDIO_NAME.upper(),
        "RECEIPT",
        "=" * 48,
        f"Receipt No : {doc.receipt_number}",
        f"Date       : {_format_datetime(doc.issued_at)}",
        f"Type       : {doc.type_label}",
        f"Customer   : {doc.customer_name or 'Customer'}",
    ]
    if doc.customer_email:
        lines.append(f"Email      : {doc.customer_email}")
    if doc.payment_reference:
        lines.append(f"Reference  : {doc.payment_reference}")
    lines.extend(["", "ITEMS", "-" * 48])
    for item in doc.line_items:
        lines.append(item.description)
        if item.detail:
            lines.append(f"  {item.detail}")
        if item.unit_price_ghs is not None:
            lines.append(f"  {item.quantity} x {_format_money(item.unit_price_ghs)} = {_format_money(item.line_total_ghs)}")
        elif item.line_total_ghs is not None:
            lines.append(f"  {_format_money(item.line_total_ghs)}")
    lines.append("")
    if doc.total_price_ghs is not None:
        lines.append(f"Subtotal     : {_format_money(doc.total_price_ghs)}")
    lines.append(f"Amount paid  : {_format_money(doc.amount_paid_ghs)}")
    if doc.balance_due_ghs is not None and doc.balance_due_ghs > 0:
        lines.append(f"Balance due  : {_format_money(doc.balance_due_ghs)}")
    lines.extend(["", "Note:", doc.footer_note, "", "Thank you for your business.", f"— {STUDIO_NAME}"])
    return "\n".join(lines)


def render_receipt_email(doc: ReceiptDocument) -> tuple[str, str, str]:
    subject = f"Your receipt — {doc.receipt_number} ({doc.type_label})"
    plain = render_receipt_plain(doc)
    greeting = f"Hi {doc.customer_name}," if doc.customer_name else "Hi there,"
    body_inner = render_receipt_body_html(doc)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#EEEEEE;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
          <tr>
            <td style="padding:0 0 16px;">
              <p style="margin:0 0 6px;font-size:13px;color:{INK_MUTED};">{greeting}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:{INK_SOFT};">
                Payment confirmed. Your receipt is below and attached as a PDF.
              </p>
            </td>
          </tr>
          <tr>
            <td>{body_inner}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, plain, html
