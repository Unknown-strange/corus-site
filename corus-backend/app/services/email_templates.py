"""Branded HTML email templates for Corus Studios."""

from decimal import Decimal
from enum import Enum

# Brand palette
COLOR_PRIMARY = "#FF5100"
COLOR_DARK = "#060607"
COLOR_LIGHT = "#FAFAFA"
COLOR_MUTED = "#6B7280"
COLOR_WHITE = "#FFFFFF"


class EmailTemplate(str, Enum):
    account_verification = "account_verification"
    password_reset = "password_reset"


def _otp_box(otp_code: str) -> str:
    return (
        f'<div style="text-align:center;margin:28px 0;">'
        f'<div style="display:inline-block;background:{COLOR_LIGHT};border:2px solid {COLOR_PRIMARY};'
        f'border-radius:10px;padding:18px 32px;">'
        f'<span style="font-size:32px;font-weight:700;color:{COLOR_DARK};'
        f'font-family:Consolas,Monaco,monospace;letter-spacing:6px;">{otp_code}</span>'
        f"</div></div>"
        f'<p style="text-align:center;margin:0;font-size:13px;color:{COLOR_MUTED};">'
        f"Enter this code in the app to continue</p>"
    )


def render_otp_email(
    template: EmailTemplate,
    otp_code: str,
    expire_minutes: int,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    """Return (subject, plain_text, html)."""
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"

    if template == EmailTemplate.account_verification:
        subject = "Verify your Corus Studios account"
        headline = "Welcome to Corus Studios"
        intro = (
            "Thanks for creating an account. Use the verification code below "
            "to confirm your email and get started."
        )
        action = "Verify account"
    else:
        subject = "Reset your Corus Studios password"
        headline = "Password reset request"
        intro = (
            "We received a request to reset your password. Use the code below "
            "to choose a new password."
        )
        action = "Reset password"

    plain_text = (
        f"{greeting}\n\n"
        f"{intro}\n\n"
        f"Your code: {otp_code}\n\n"
        f"This code expires in {expire_minutes} minutes.\n\n"
        "If you did not request this, you can safely ignore this email.\n\n"
        "— Corus Studios"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:{COLOR_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{COLOR_LIGHT};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:{COLOR_WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(6,6,7,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:{COLOR_DARK};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                <span style="color:{COLOR_WHITE};">Corus</span>
                <span style="color:{COLOR_PRIMARY};"> Studios</span>
              </p>
            </td>
          </tr>
          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background-color:{COLOR_PRIMARY};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;background-color:{COLOR_WHITE};">
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:{COLOR_DARK};line-height:1.3;">{headline}</h1>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">{intro}</p>
              <p style="margin:20px 0 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:{COLOR_PRIMARY};">{action}</p>
              {_otp_box(otp_code)}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                <tr>
                  <td style="background-color:{COLOR_LIGHT};border-radius:8px;padding:14px 16px;border-left:4px solid {COLOR_PRIMARY};">
                    <p style="margin:0;font-size:13px;line-height:1.5;color:{COLOR_DARK};">
                      <strong>Expires in {expire_minutes} minutes.</strong>
                      For your security, do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:{COLOR_MUTED};">
                If you did not request this email, you can safely ignore it. Your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:{COLOR_DARK};padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:{COLOR_WHITE};opacity:0.7;">
                &copy; Corus Studios &middot;
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, plain_text, html


def render_low_stock_email(
    product_name: str,
    stock: int,
    threshold: int,
    price: Decimal,
) -> tuple[str, str, str]:
    subject = f"Low stock alert: {product_name}"
    plain_text = (
        f"Product \"{product_name}\" is running low.\n\n"
        f"Current stock: {stock}\n"
        f"Threshold: {threshold}\n"
        f"Price: GHS {price:.2f}\n\n"
        "Log in to the admin dashboard to restock.\n\n"
        "— Corus Studios"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:{COLOR_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{COLOR_LIGHT};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:{COLOR_WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(6,6,7,0.08);">
          <tr>
            <td style="background-color:{COLOR_DARK};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;">
                <span style="color:{COLOR_WHITE};">Corus</span>
                <span style="color:{COLOR_PRIMARY};"> Studios</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background-color:{COLOR_PRIMARY};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:{COLOR_DARK};">Low stock alert</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                <strong>{product_name}</strong> has dropped to or below your stock threshold.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Current stock:</strong> {stock}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Threshold:</strong> {threshold}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Price:</strong> GHS {price:.2f}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:{COLOR_MUTED};">
                Restock this item in the admin dashboard to avoid missed sales.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:{COLOR_DARK};padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:{COLOR_WHITE};opacity:0.7;">
                &copy; Corus Studios &middot; Inventory alert
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, plain_text, html


def _branded_email_shell(subject: str, headline: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:{COLOR_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{COLOR_LIGHT};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:{COLOR_WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(6,6,7,0.08);">
          <tr>
            <td style="background-color:{COLOR_DARK};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;">
                <span style="color:{COLOR_WHITE};">Corus</span>
                <span style="color:{COLOR_PRIMARY};"> Studios</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background-color:{COLOR_PRIMARY};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:{COLOR_DARK};">{headline}</h1>
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="background-color:{COLOR_DARK};padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:{COLOR_WHITE};opacity:0.7;">
                &copy; Corus Studios
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def render_payment_success_email(
    session_name: str,
    deposit_ghs: Decimal,
    balance_due_ghs: Decimal,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Payment successful — session booking confirmed"
    plain_text = (
        f"{greeting}\n\n"
        f"Your deposit for {session_name} was received.\n\n"
        f"Deposit paid: GHS {deposit_ghs:.2f}\n"
        f"Balance due at studio: GHS {balance_due_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your deposit for <strong>{session_name}</strong> was received. Your session is confirmed.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Deposit paid:</strong> GHS {deposit_ghs:.2f}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Balance due at studio:</strong> GHS {balance_due_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Payment successful", body)
    return subject, plain_text, html


def render_receipt_ready_email(
    receipt_number: str,
    amount_ghs: Decimal,
    session_name: str,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = f"Your receipt is ready — {receipt_number}"
    plain_text = (
        f"{greeting}\n\n"
        f"Receipt {receipt_number} for {session_name}.\n"
        f"Amount: GHS {amount_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your receipt for <strong>{session_name}</strong> is ready.
              </p>
              <div style="text-align:center;margin:20px 0;">
                <div style="display:inline-block;background:{COLOR_LIGHT};border:2px solid {COLOR_PRIMARY};border-radius:10px;padding:18px 32px;">
                  <span style="font-size:18px;font-weight:700;color:{COLOR_DARK};">{receipt_number}</span>
                </div>
              </div>
              <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Amount:</strong> GHS {amount_ghs:.2f}</p>"""
    html = _branded_email_shell(subject, "Receipt ready", body)
    return subject, plain_text, html


def render_rental_paid_email(
    equipment_name: str,
    start_date,
    end_date,
    total_price_ghs: Decimal,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Rental confirmed — payment received"
    plain_text = (
        f"{greeting}\n\n"
        f"Your rental for {equipment_name} is confirmed.\n\n"
        f"Period: {start_date} to {end_date}\n"
        f"Total paid: GHS {total_price_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your rental for <strong>{equipment_name}</strong> is confirmed.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Period:</strong> {start_date} to {end_date}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Total paid:</strong> GHS {total_price_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Rental confirmed", body)
    return subject, plain_text, html


def render_reservation_submitted_email(
    requested_start,
    requested_end,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Studio reservation request received"
    plain_text = (
        f"{greeting}\n\n"
        f"We received your studio reservation request.\n"
        f"Requested: {requested_start} to {requested_end}\n\n"
        "Our team will review it and get back to you shortly.\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                We received your studio reservation request and will review it shortly.
              </p>
              <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Requested:</strong> {requested_start} to {requested_end}</p>"""
    html = _branded_email_shell(subject, "Reservation submitted", body)
    return subject, plain_text, html


def render_reservation_approved_email(
    approved_price_ghs: Decimal,
    deposit_ghs: Decimal,
    balance_due_ghs: Decimal,
    payment_deadline,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Studio reservation approved — pay deposit to confirm"
    plain_text = (
        f"{greeting}\n\n"
        f"Your studio reservation was approved.\n\n"
        f"Total price: GHS {approved_price_ghs:.2f}\n"
        f"Deposit due now: GHS {deposit_ghs:.2f}\n"
        f"Balance due at studio: GHS {balance_due_ghs:.2f}\n"
        f"Pay deposit by: {payment_deadline}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your studio reservation was approved. Pay the deposit to confirm your booking.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Total price:</strong> GHS {approved_price_ghs:.2f}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Deposit due now:</strong> GHS {deposit_ghs:.2f}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Balance at studio:</strong> GHS {balance_due_ghs:.2f}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Pay by:</strong> {payment_deadline}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Reservation approved", body)
    return subject, plain_text, html


def render_reservation_rejected_email(
    rejection_reason: str | None,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Studio reservation update"
    reason_text = rejection_reason or "We are unable to accommodate this request at the selected time."
    plain_text = (
        f"{greeting}\n\n"
        f"Your studio reservation request was not approved.\n\n"
        f"Reason: {reason_text}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your studio reservation request was not approved.
              </p>
              <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Reason:</strong> {reason_text}</p>"""
    html = _branded_email_shell(subject, "Reservation not approved", body)
    return subject, plain_text, html


def render_reservation_deposit_paid_email(
    requested_start,
    requested_end,
    deposit_ghs: Decimal,
    balance_due_ghs: Decimal,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Studio reserved — deposit received"
    plain_text = (
        f"{greeting}\n\n"
        f"Your studio reservation is confirmed.\n\n"
        f"Period: {requested_start} to {requested_end}\n"
        f"Deposit paid: GHS {deposit_ghs:.2f}\n"
        f"Balance due at studio: GHS {balance_due_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your studio reservation is confirmed.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Period:</strong> {requested_start} to {requested_end}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Deposit paid:</strong> GHS {deposit_ghs:.2f}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Balance at studio:</strong> GHS {balance_due_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Studio reserved", body)
    return subject, plain_text, html


def render_reservation_expired_email(
    requested_start,
    requested_end,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Studio reservation approval expired"
    plain_text = (
        f"{greeting}\n\n"
        f"Your approved studio reservation ({requested_start} to {requested_end}) "
        f"expired because the deposit was not paid in time.\n\n"
        "You may submit a new request if you still need the studio.\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your approved reservation expired because the deposit was not paid in time.
              </p>
              <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Requested:</strong> {requested_start} to {requested_end}</p>"""
    html = _branded_email_shell(subject, "Approval expired", body)
    return subject, plain_text, html


def render_order_payment_success_email(
    order_id,
    total_ghs: Decimal,
    item_count: int,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = "Order confirmed — payment received"
    plain_text = (
        f"{greeting}\n\n"
        f"Your order was paid successfully.\n\n"
        f"Order ID: {order_id}\n"
        f"Items: {item_count}\n"
        f"Total paid: GHS {total_ghs:.2f}\n\n"
        "Pick up your items at the studio when ready.\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your order payment was received. We will prepare your items for pickup.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Order ID:</strong> {order_id}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Items:</strong> {item_count}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Total paid:</strong> GHS {total_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Order confirmed", body)
    return subject, plain_text, html


def render_order_receipt_email(
    receipt_number: str,
    amount_ghs: Decimal,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = f"Your receipt is ready — {receipt_number}"
    plain_text = (
        f"{greeting}\n\n"
        f"Receipt {receipt_number} for your shop order.\n"
        f"Amount: GHS {amount_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                Your receipt for your shop order is ready.
              </p>
              <div style="text-align:center;margin:20px 0;">
                <div style="display:inline-block;background:{COLOR_LIGHT};border:2px solid {COLOR_PRIMARY};border-radius:10px;padding:18px 32px;">
                  <span style="font-size:18px;font-weight:700;color:{COLOR_DARK};">{receipt_number}</span>
                </div>
              </div>
              <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Amount:</strong> GHS {amount_ghs:.2f}</p>"""
    html = _branded_email_shell(subject, "Receipt ready", body)
    return subject, plain_text, html


def render_new_order_admin_email(
    order_id,
    customer_email: str | None,
    total_ghs: Decimal,
    item_count: int,
) -> tuple[str, str, str]:
    subject = "New paid shop order"
    customer_label = customer_email or "Unknown customer"
    plain_text = (
        f"A new shop order was paid.\n\n"
        f"Order ID: {order_id}\n"
        f"Customer: {customer_label}\n"
        f"Items: {item_count}\n"
        f"Total: GHS {total_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                A new shop order was paid and is ready for fulfillment.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Order ID:</strong> {order_id}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Customer:</strong> {customer_label}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Items:</strong> {item_count}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Total:</strong> GHS {total_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "New shop order", body)
    return subject, plain_text, html


def render_booking_reminder_email(
    session_name: str,
    slot_starts_at,
    slot_ends_at,
    balance_due_ghs: Decimal,
    recipient_name: str | None = None,
) -> tuple[str, str, str]:
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
    subject = f"Reminder: your {session_name} session is tomorrow"
    plain_text = (
        f"{greeting}\n\n"
        f"Reminder: your session is coming up.\n\n"
        f"Session: {session_name}\n"
        f"When: {slot_starts_at} to {slot_ends_at}\n"
        f"Balance due at studio: GHS {balance_due_ghs:.2f}\n\n"
        "— Corus Studios"
    )
    body = f"""
              <p style="margin:0 0 8px;font-size:14px;color:{COLOR_MUTED};">{greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{COLOR_DARK};opacity:0.85;">
                This is a friendly reminder about your upcoming session.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_LIGHT};border-radius:8px;border-left:4px solid {COLOR_PRIMARY};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>Session:</strong> {session_name}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:{COLOR_DARK};"><strong>When:</strong> {slot_starts_at} to {slot_ends_at}</p>
                    <p style="margin:0;font-size:14px;color:{COLOR_DARK};"><strong>Balance at studio:</strong> GHS {balance_due_ghs:.2f}</p>
                  </td>
                </tr>
              </table>"""
    html = _branded_email_shell(subject, "Session reminder", body)
    return subject, plain_text, html
