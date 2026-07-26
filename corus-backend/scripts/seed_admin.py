"""Create the initial admin account (username + password only)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserRole


def seed_admin() -> None:
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
        if existing_admin:
            print(f"Admin already exists: {existing_admin.username}")
            return

        admin = User(
            username=settings.admin_username,
            hashed_password=hash_password(settings.admin_password),
            role=UserRole.admin,
            email_verified=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {settings.admin_username}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
