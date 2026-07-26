"""Seed rent equipment catalog."""

import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models.equipment_for_rent import EquipmentForRent


def seed_rentals() -> None:
    db = SessionLocal()
    try:
        if db.query(EquipmentForRent).count() > 0:
            print("Rent equipment already seeded — skipping.")
            return

        items = [
            EquipmentForRent(
                name="Canon EOS R6",
                slug="canon-eos-r6",
                description="Full-frame mirrorless camera body for photo and video.",
                daily_rate_ghs=Decimal("150.00"),
                stock=3,
                low_stock_threshold=1,
            ),
            EquipmentForRent(
                name="Sony A7 IV",
                slug="sony-a7-iv",
                description="Versatile hybrid camera for studio shoots.",
                daily_rate_ghs=Decimal("175.00"),
                stock=2,
                low_stock_threshold=1,
            ),
            EquipmentForRent(
                name="Godox AD600 Pro",
                slug="godox-ad600-pro",
                description="600W studio strobe with wireless control.",
                daily_rate_ghs=Decimal("80.00"),
                stock=4,
            ),
            EquipmentForRent(
                name="Rode PodMic",
                slug="rode-podmic",
                description="Dynamic broadcast microphone for podcast recording.",
                daily_rate_ghs=Decimal("35.00"),
                stock=6,
            ),
        ]
        db.add_all(items)
        db.commit()
        print(f"Seeded {len(items)} rent equipment items.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_rentals()
