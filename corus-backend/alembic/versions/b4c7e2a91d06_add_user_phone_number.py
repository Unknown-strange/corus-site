"""add user phone number

Revision ID: b4c7e2a91d06
Revises: a9d2e4f81b05
Create Date: 2026-07-27 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b4c7e2a91d06"
down_revision: Union[str, Sequence[str], None] = "a9d2e4f81b05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
