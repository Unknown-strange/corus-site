"""add gallery category to site content

Revision ID: c8f3a1b92e04
Revises: b4c7e2a91d06
Create Date: 2026-08-17 22:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8f3a1b92e04"
down_revision: Union[str, Sequence[str], None] = "b4c7e2a91d06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

gallery_category = sa.Enum(
    "Birthday",
    "Graduation",
    "Matriculation",
    "Lifestyle (weddings and funerals)",
    "Agenda",
    name="gallery_category",
)


def upgrade() -> None:
    gallery_category.create(op.get_bind(), checkfirst=True)
    op.add_column("site_content", sa.Column("category", gallery_category, nullable=True))


def downgrade() -> None:
    op.drop_column("site_content", "category")
    gallery_category.drop(op.get_bind(), checkfirst=True)
