"""Remove all admin users from the database."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models.user import User, UserRole


def delete_admins() -> None:
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == UserRole.admin).all()
        if not admins:
            print("No admin accounts found.")
            return

        for admin in admins:
            db.query(User).filter(User.created_by_id == admin.id).update(
                {"created_by_id": None}, synchronize_session=False
            )
            print(f"Deleting admin: {admin.username or admin.email or admin.id}")
            db.delete(admin)

        db.commit()
        print(f"Deleted {len(admins)} admin account(s).")
    finally:
        db.close()


if __name__ == "__main__":
    delete_admins()
