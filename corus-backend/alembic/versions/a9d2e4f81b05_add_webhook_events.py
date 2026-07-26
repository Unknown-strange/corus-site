"""add webhook events

Revision ID: a9d2e4f81b05
Revises: f3b8c1d92a04
Create Date: 2026-07-26 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a9d2e4f81b05"
down_revision: Union[str, Sequence[str], None] = "f3b8c1d92a04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

webhook_provider = postgresql.ENUM("paystack", name="webhook_provider", create_type=False)


def upgrade() -> None:
    webhook_provider.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider", webhook_provider, nullable=False),
        sa.Column("event_id", sa.String(length=128), nullable=False),
        sa.Column("reference", sa.String(length=100), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "event_id", name="uq_webhook_events_provider_event_id"),
    )
    op.create_index(op.f("ix_webhook_events_reference"), "webhook_events", ["reference"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_webhook_events_reference"), table_name="webhook_events")
    op.drop_table("webhook_events")
    webhook_provider.drop(op.get_bind(), checkfirst=True)
