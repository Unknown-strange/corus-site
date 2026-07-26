"""Seed session types, booking settings, and studio slots."""

import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.booking_settings import BookingSettings
from app.models.session_type import SessionType
from app.models.studio_slot import StudioSlot


def seed_sessions() -> None:
    db = SessionLocal()
    try:
        if db.query(SessionType).count() > 0:
            print("Sessions already seeded — skipping.")
            return

        if db.query(BookingSettings).first() is None:
            db.add(
                BookingSettings(
                    session_deposit_ghs=Decimal(str(settings.session_deposit_ghs)),
                    reservation_deposit_ghs=Decimal(str(settings.reservation_deposit_ghs)),
                )
            )

        types = [
            SessionType(
                name="Photoshoot",
                slug="photoshoot",
                description="Professional photo session in studio",
                price_ghs=Decimal("500.00"),
                duration_minutes=120,
            ),
            SessionType(
                name="Podcast Recording",
                slug="podcast-recording",
                description="Audio podcast recording session",
                price_ghs=Decimal("350.00"),
                duration_minutes=90,
            ),
            SessionType(
                name="Video Shoot",
                slug="video-shoot",
                description="Video production session",
                price_ghs=Decimal("800.00"),
                duration_minutes=180,
            ),
        ]
        db.add_all(types)
        db.flush()

        base = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        slots = []
        for day in range(7):
            day_start = base + timedelta(days=day)
            for hour in (9, 13, 17):
                start = day_start.replace(hour=hour)
                end = start + timedelta(hours=2)
                slots.append(StudioSlot(starts_at=start, ends_at=end))

        db.add_all(slots)
        db.commit()
        print(f"Seeded {len(types)} session types and {len(slots)} studio slots.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_sessions()
