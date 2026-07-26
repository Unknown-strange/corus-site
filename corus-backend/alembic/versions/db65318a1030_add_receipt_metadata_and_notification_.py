"""add_receipt_metadata_and_notification_logs

Revision ID: db65318a1030
Revises: 3d819c3d7db6
Create Date: 2026-07-26 17:47:09.319791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'db65318a1030'
down_revision: Union[str, Sequence[str], None] = '3d819c3d7db6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    receipt_type_enum = postgresql.ENUM(
        "session_deposit",
        "order_payment",
        "rental_payment",
        "reservation_deposit",
        name="receipt_type",
        create_type=False,
    )
    receipt_type_enum.create(op.get_bind(), checkfirst=True)

    notification_channel_enum = postgresql.ENUM("email", name="notification_channel", create_type=False)
    notification_channel_enum.create(op.get_bind(), checkfirst=True)

    notification_status_enum = postgresql.ENUM("sent", "skipped", "failed", name="notification_status", create_type=False)
    notification_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("channel", notification_channel_enum, nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("recipient", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("status", notification_status_enum, nullable=False),
        sa.Column("reference_type", sa.String(length=50), nullable=True),
        sa.Column("reference_id", sa.UUID(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notification_logs_event_type"), "notification_logs", ["event_type"], unique=False)
    op.create_index(op.f("ix_notification_logs_user_id"), "notification_logs", ["user_id"], unique=False)
    op.add_column("receipts", sa.Column("receipt_type", receipt_type_enum, nullable=True))
    op.add_column("receipts", sa.Column("summary_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("receipts", sa.Column("pdf_file_key", sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("receipts", "pdf_file_key")
    op.drop_column("receipts", "summary_json")
    op.drop_column("receipts", "receipt_type")
    op.drop_index(op.f("ix_notification_logs_user_id"), table_name="notification_logs")
    op.drop_index(op.f("ix_notification_logs_event_type"), table_name="notification_logs")
    op.drop_table("notification_logs")
    op.execute("DROP TYPE IF EXISTS receipt_type")
    op.execute("DROP TYPE IF EXISTS notification_channel")
    op.execute("DROP TYPE IF EXISTS notification_status")
