"""Seed sample catalog and CMS content for frontend development."""

import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.product import ProductForSale
from app.models.product_category import ProductCategory
from app.models.session_type import SessionType
from app.models.site_content import ContentSection, SiteContent


def seed_catalog() -> None:
    db = SessionLocal()
    try:
        if db.query(ProductCategory).count() > 0:
            print("Catalog already seeded — skipping.")
            return

        cameras = ProductCategory(
            name="Cameras",
            slug="cameras",
            description="Professional camera bodies and kits",
            sort_order=1,
        )
        audio = ProductCategory(
            name="Audio",
            slug="audio",
            description="Microphones and recording gear",
            sort_order=2,
        )
        db.add_all([cameras, audio])
        db.flush()

        products = [
            ProductForSale(
                name="Sony A7 IV Body",
                slug="sony-a7-iv-body",
                description="Full-frame mirrorless camera body, excellent for studio sessions.",
                price=Decimal("18500.00"),
                stock=3,
                category_id=cameras.id,
                is_active=True,
            ),
            ProductForSale(
                name="Rode NT1 Condenser Mic",
                slug="rode-nt1-condenser-mic",
                description="Studio condenser microphone with low self-noise.",
                price=Decimal("3200.00"),
                stock=8,
                category_id=audio.id,
                is_active=True,
            ),
            ProductForSale(
                name="Light Stand Pro",
                slug="light-stand-pro",
                description="Heavy-duty light stand for studio setups.",
                price=Decimal("450.00"),
                stock=0,
                is_active=True,
            ),
        ]
        db.add_all(products)

        birthday_type = db.query(SessionType).filter(SessionType.slug == "birthday").first()

        content_blocks = [
            SiteContent(
                section=ContentSection.homepage,
                title="Welcome to Corus Studios",
                body="Book sessions, buy gear, and rent equipment — all from one place in Accra.",
                sort_order=1,
                is_published=True,
            ),
            SiteContent(
                section=ContentSection.rental_info,
                title="How rentals work",
                body="Submit a rental request, wait for admin approval, then pay in the app. Pick up at the studio.",
                sort_order=1,
                is_published=True,
            ),
            SiteContent(
                section=ContentSection.gallery,
                title="Studio Session",
                caption="Behind the scenes at Corus Studios",
                session_type_id=birthday_type.id if birthday_type else None,
                sort_order=1,
                is_published=True,
            ),
        ]
        db.add_all(content_blocks)
        db.commit()

        if not settings.imagekit_configured:
            print("Note: ImageKit not configured — seeded without product/gallery images.")
        print("Catalog seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_catalog()
