"""Expire unpaid studio reservation approvals (run manually or via cron)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.services.approval_expiry import expire_unpaid_reservation_approvals


def main() -> None:
    db = SessionLocal()
    try:
        count = expire_unpaid_reservation_approvals(db)
        print(f"Expired {count} reservation approval(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
