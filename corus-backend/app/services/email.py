import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    plain_text: str,
    html: str,
    *,
    force_send: bool = False,
    pdf_attachment: tuple[str, bytes] | None = None,
) -> bool:
    if settings.disable_email_send and not force_send:
        logger.info("[DISABLED] Email to %s | subject: %s", to_email, subject)
        if settings.debug:
            print(f"\n[DISABLED EMAIL] To: {to_email}\nSubject: {subject}\n{plain_text}\n")
        return True

    if settings.smtp_configured:
        try:
            message = MIMEMultipart("mixed")
            message["From"] = settings.email_from or settings.smtp_user
            message["To"] = to_email
            message["Subject"] = subject

            alt = MIMEMultipart("alternative")
            alt.attach(MIMEText(plain_text, "plain", "utf-8"))
            alt.attach(MIMEText(html, "html", "utf-8"))
            message.attach(alt)

            if pdf_attachment is not None:
                filename, pdf_bytes = pdf_attachment
                part = MIMEApplication(pdf_bytes, _subtype="pdf")
                part.add_header("Content-Disposition", "attachment", filename=filename)
                message.attach(part)

            password = (settings.smtp_password or "").replace(" ", "")
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
                server.starttls()
                server.login(settings.smtp_user, password)
                server.send_message(message)
            logger.info("Email sent to %s: %s", to_email, subject)
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            return False

    if settings.debug:
        logger.warning("[DEV] Email to %s | subject: %s", to_email, subject)
        print(f"\n[DEV EMAIL] To: {to_email}\nSubject: {subject}\n{plain_text}\n")
        return True

    logger.error(
        "Email not sent to %s — SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.",
        to_email,
    )
    return False
