import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User, UserRole


def _split_full_name(full_name: str) -> tuple[str, str | None]:
    parts = full_name.strip().split()
    if not parts:
        return full_name.strip(), None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def _normalize_phone(phone: str) -> str:
    return phone.strip().replace(" ", "")


def ensure_walk_in_customer(
    db: Session,
    *,
    full_name: str,
    phone: str,
    email: str | None,
    created_by_id: uuid.UUID | None = None,
) -> User:
    normalized_phone = _normalize_phone(phone)
    first_name, last_name = _split_full_name(full_name)

    if email:
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing is not None:
            existing.first_name = first_name
            existing.last_name = last_name
            existing.phone_number = normalized_phone
            db.add(existing)
            db.flush()
            return existing

    existing_by_phone = db.query(User).filter(User.phone_number == normalized_phone).first()
    if existing_by_phone is not None:
        if not existing_by_phone.first_name:
            existing_by_phone.first_name = first_name
        if not existing_by_phone.last_name and last_name:
            existing_by_phone.last_name = last_name
        if email and not existing_by_phone.email:
            conflict = db.query(User).filter(User.email == email.lower()).first()
            if conflict is None:
                existing_by_phone.email = email.lower()
        db.add(existing_by_phone)
        db.flush()
        return existing_by_phone

    username = f"walkin_{uuid.uuid4().hex[:10]}"
    while db.query(User).filter(User.username == username).first() is not None:
        username = f"walkin_{uuid.uuid4().hex[:10]}"

    user = User(
        email=email.lower() if email else None,
        username=username,
        first_name=first_name,
        last_name=last_name,
        phone_number=normalized_phone,
        hashed_password=hash_password(secrets.token_urlsafe(24)),
        role=UserRole.customer,
        email_verified=bool(email),
        created_by_id=created_by_id,
    )
    db.add(user)
    try:
        db.flush()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create walk-in customer record",
        ) from exc
    return user
