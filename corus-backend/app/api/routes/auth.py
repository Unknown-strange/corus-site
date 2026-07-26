from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.rate_limit import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models.email_verification import EmailVerification, VerificationPurpose
from app.models.user import User, UserRole
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    PasswordChangeRequest,
    RegisterPendingResponse,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    TokenResponse,
    UsernameChangeRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.services.email_templates import EmailTemplate
from app.services.otp import (
    generate_otp_code,
    hash_otp,
    otp_expires_at,
    send_otp_email,
    verify_otp_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])

PASSWORD_RESET_SENT_MESSAGE = (
    "If an account exists with that email, a password reset code has been sent."
)


def _find_user_by_login(db: DbSession, login: str) -> User | None:
    login = login.strip()
    user = db.query(User).filter(User.username == login).first()
    if user is None:
        user = db.query(User).filter(User.email == login.lower()).first()
    return user


def _issue_otp(
    db: DbSession,
    user: User,
    purpose: VerificationPurpose,
) -> tuple[str, bool]:
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.purpose == purpose,
    ).delete()

    otp_code = generate_otp_code()
    verification = EmailVerification(
        user_id=user.id,
        otp_hash=hash_otp(otp_code),
        purpose=purpose,
        expires_at=otp_expires_at(),
    )
    db.add(verification)
    db.flush()

    template = (
        EmailTemplate.account_verification
        if purpose == VerificationPurpose.registration
        else EmailTemplate.password_reset
    )
    sent = send_otp_email(
        user.email or "",
        otp_code,
        template=template,
        recipient_name=user.first_name,
    )
    return otp_code, sent


def _can_request_password_reset(user: User) -> bool:
    return (
        user.role == UserRole.customer
        and bool(user.email)
        and user.email_verified
        and user.is_active
    )


def _password_reset_cooldown_active(db: DbSession, user: User) -> bool:
    latest = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == VerificationPurpose.password_reset,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if latest is None:
        return False
    cooldown = timedelta(seconds=settings.otp_resend_cooldown_seconds)
    return latest.last_sent_at.replace(tzinfo=UTC) + cooldown > datetime.now(UTC)


@router.post("/register", response_model=RegisterPendingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_auth)
def register(request: Request, payload: RegisterRequest, db: DbSession) -> RegisterPendingResponse:
    email = payload.email.lower()
    username = payload.username.strip()

    existing = db.query(User).filter((User.email == email) | (User.username == username)).first()
    if existing:
        if existing.email_verified:
            if existing.email == email:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

        existing.first_name = payload.first_name.strip()
        existing.last_name = payload.last_name.strip()
        existing.username = username
        existing.email = email
        existing.hashed_password = hash_password(payload.password)
        user = existing
    else:
        user = User(
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            username=username,
            email=email,
            hashed_password=hash_password(payload.password),
            role=UserRole.customer,
            email_verified=False,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already in use")

    otp_code, sent = _issue_otp(db, user, VerificationPurpose.registration)
    db.commit()

    response = RegisterPendingResponse(
        message="Verification code sent to your email" if sent else "Verification code generated",
        email=email,
    )
    if settings.debug:
        response.dev_otp = otp_code
    return response


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth)
def verify_otp(request: Request, payload: VerifyOtpRequest, db: DbSession) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == VerificationPurpose.registration,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if verification is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verification code found")

    if verification.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")

    if verification.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Request a new code.",
        )

    if not verify_otp_code(payload.otp, verification.otp_hash):
        verification.attempts += 1
        db.add(verification)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.email_verified = True
    db.delete(verification)
    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/resend-otp", response_model=RegisterPendingResponse)
@limiter.limit(settings.rate_limit_auth)
def resend_otp(request: Request, payload: ResendOtpRequest, db: DbSession) -> RegisterPendingResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    latest = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == VerificationPurpose.registration,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if latest is not None:
        cooldown = timedelta(seconds=settings.otp_resend_cooldown_seconds)
        if latest.last_sent_at.replace(tzinfo=UTC) + cooldown > datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting a new code",
            )

    otp_code, sent = _issue_otp(db, user, VerificationPurpose.registration)
    db.commit()

    response = RegisterPendingResponse(
        message="Verification code sent to your email" if sent else "Verification code generated",
        email=user.email or payload.email.lower(),
    )
    if settings.debug:
        response.dev_otp = otp_code
    return response


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(settings.rate_limit_auth)
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: DbSession) -> MessageResponse:
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    otp_code: str | None = None
    if user is not None and _can_request_password_reset(user) and not _password_reset_cooldown_active(db, user):
        otp_code, _sent = _issue_otp(db, user, VerificationPurpose.password_reset)
        db.commit()

    response = MessageResponse(message=PASSWORD_RESET_SENT_MESSAGE)
    if settings.debug and otp_code:
        response.dev_otp = otp_code
    return response


@router.post("/reset-password", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth)
def reset_password(request: Request, payload: ResetPasswordRequest, db: DbSession) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not _can_request_password_reset(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == VerificationPurpose.password_reset,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    if verification.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    if verification.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Request a new code.",
        )

    if not verify_otp_code(payload.otp, verification.otp_hash):
        verification.attempts += 1
        db.add(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.delete(verification)
    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_login)
def login(request: Request, payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = _find_user_by_login(db, payload.username)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )
    if user.role == UserRole.customer and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Check your inbox or request a new code.",
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/password", response_model=UserResponse)
def change_password(payload: PasswordChangeRequest, current_user: CurrentUser, db: DbSession) -> User:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/username", response_model=UserResponse)
def change_username(payload: UsernameChangeRequest, current_user: CurrentUser, db: DbSession) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change their username",
        )
    if not current_user.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin account has no username set",
        )
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.username = payload.username.strip()
    db.add(current_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    db.refresh(current_user)
    return current_user
