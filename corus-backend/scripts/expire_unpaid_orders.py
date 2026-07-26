"""Expire unpaid shop orders and restore stock (run manually or via cron)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.services.order_expiry import expire_unpaid_orders


def main() -> None:
    db = SessionLocal()
    try:
        count = expire_unpaid_orders(db)
        print(f"Expired {count} unpaid order(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
