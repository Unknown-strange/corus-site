"""add password_reset to verification_purpose enum

Revision ID: a7f2c1d8e904
Revises: 58d3d0ed008b
Create Date: 2026-07-26 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7f2c1d8e904"
down_revision: Union[str, Sequence[str], None] = "58d3d0ed008b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE verification_purpose ADD VALUE IF NOT EXISTS 'password_reset'")


def downgrade() -> None:
    pass
