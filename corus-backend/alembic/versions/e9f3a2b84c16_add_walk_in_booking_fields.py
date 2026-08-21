"""add walk-in booking fields and offline payment purpose

Revision ID: e9f3a2b84c16
Revises: d4e8f2a61b05
Create Date: 2026-08-21 16:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e9f3a2b84c16"
down_revision: Union[str, Sequence[str], None] = "d4e8f2a61b05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

booking_source = sa.Enum("online", "walk_in", name="booking_source")
booking_payment_method = sa.Enum("online", "offline", name="booking_payment_method")


def upgrade() -> None:
    booking_source.create(op.get_bind(), checkfirst=True)
    booking_payment_method.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "bookings",
        sa.Column(
            "booking_source",
            booking_source,
            nullable=False,
            server_default="online",
        ),
    )
    op.add_column(
        "bookings",
        sa.Column("payment_method", booking_payment_method, nullable=True),
    )
    op.add_column("bookings", sa.Column("customer_full_name", sa.String(length=200), nullable=True))
    op.add_column("bookings", sa.Column("package_name", sa.String(length=150), nullable=True))
    op.add_column("bookings", sa.Column("package_description", sa.Text(), nullable=True))
    op.add_column("bookings", sa.Column("package_duration_minutes", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("pictures_count", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("picture_pickup_date", sa.Date(), nullable=True))
    op.add_column("bookings", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("bookings", "booking_source", server_default=None)

    op.execute("ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'walk_in_offline'")
    op.execute("ALTER TYPE receipt_type ADD VALUE IF NOT EXISTS 'walk_in_session'")


def downgrade() -> None:
    op.drop_column("bookings", "accepted_at")
    op.drop_column("bookings", "picture_pickup_date")
    op.drop_column("bookings", "pictures_count")
    op.drop_column("bookings", "package_duration_minutes")
    op.drop_column("bookings", "package_description")
    op.drop_column("bookings", "package_name")
    op.drop_column("bookings", "customer_full_name")
    op.drop_column("bookings", "payment_method")
    op.drop_column("bookings", "booking_source")
    booking_payment_method.drop(op.get_bind(), checkfirst=True)
    booking_source.drop(op.get_bind(), checkfirst=True)
