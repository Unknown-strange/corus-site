"""Expire stale slot holds (run manually or via cron)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.services.slot_availability import expire_stale_holds


def main() -> None:
    db = SessionLocal()
    try:
        count = expire_stale_holds(db)
        print(f"Expired {count} hold(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
