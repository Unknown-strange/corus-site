"""Send booking reminder emails (run manually or via cron)."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.services.booking_reminders import send_booking_reminders


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        count = send_booking_reminders(db, dry_run=args.dry_run)
        label = "Would send" if args.dry_run else "Sent"
        print(f"{label} {count} booking reminder(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
