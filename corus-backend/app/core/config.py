from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Corus Studios API"
    database_url: str
    secret_key: str
    debug: bool = True
    access_token_expire_minutes: int = 60
    admin_username: str = "admin"
    admin_password: str = "change-me-on-first-run"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    email_from: str | None = None

    otp_expire_minutes: int = 10
    otp_resend_cooldown_seconds: int = 60
    otp_max_attempts: int = 5

    imagekit_private_key: str | None = None
    imagekit_public_key: str | None = None
    imagekit_url_endpoint: str | None = None
    max_upload_size_mb: int = 20

    default_low_stock_threshold: int = 5
    admin_alert_email: str | None = None

    paystack_secret_key: str | None = None
    paystack_public_key: str | None = None
    paystack_callback_url: str | None = None
    api_base_url: str = "http://127.0.0.1:8000"
    frontend_url: str = "http://localhost:3000"

    session_deposit_ghs: int = 50
    reservation_deposit_ghs: int = 50
    slot_hold_minutes: int = 15
    post_approval_payment_hours: int = 48
    order_payment_minutes: int = 15
    booking_reminder_hours: int = 24
    admin_email_copy: bool = True
    disable_email_send: bool = False
    studio_timezone: str = "Africa/Accra"
    finance_low_profit_threshold_ghs: int | None = None
    finance_high_expense_threshold_ghs: int | None = None

    rate_limit_enabled: bool = True
    rate_limit_default: str = "200/minute"
    rate_limit_login: str = "10/minute"
    rate_limit_auth: str = "5/minute"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password and self.email_from)

    @property
    def imagekit_configured(self) -> bool:
        return bool(self.imagekit_private_key and self.imagekit_url_endpoint)

    @property
    def paystack_configured(self) -> bool:
        return bool(self.paystack_secret_key and self.paystack_public_key)


settings = Settings()
