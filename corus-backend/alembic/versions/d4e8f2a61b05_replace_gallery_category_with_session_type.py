"""replace gallery category enum with session type fk

Revision ID: d4e8f2a61b05
Revises: c8f3a1b92e04
Create Date: 2026-08-18 00:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e8f2a61b05"
down_revision: Union[str, Sequence[str], None] = "c8f3a1b92e04"
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
    op.add_column(
        "site_content",
        sa.Column("session_type_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_site_content_session_type_id",
        "site_content",
        "session_types",
        ["session_type_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_site_content_session_type_id"),
        "site_content",
        ["session_type_id"],
        unique=False,
    )
    op.drop_column("site_content", "category")
    gallery_category.drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    gallery_category.create(op.get_bind(), checkfirst=True)
    op.add_column("site_content", sa.Column("category", gallery_category, nullable=True))
    op.drop_index(op.f("ix_site_content_session_type_id"), table_name="site_content")
    op.drop_constraint("fk_site_content_session_type_id", "site_content", type_="foreignkey")
    op.drop_column("site_content", "session_type_id")
