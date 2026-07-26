"""add financial records

Revision ID: f3b8c1d92a04
Revises: e8a4f2b91c03
Create Date: 2026-07-26 19:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f3b8c1d92a04"
down_revision: Union[str, Sequence[str], None] = "e8a4f2b91c03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

financial_record_type = postgresql.ENUM(
    "income", "expense", name="financial_record_type", create_type=False
)
financial_record_source = postgresql.ENUM(
    "payment", "manual", name="financial_record_source", create_type=False
)
financial_category = postgresql.ENUM(
    "session_deposit",
    "order_payment",
    "rental_payment",
    "reservation_deposit",
    "cash_income",
    "other_income",
    "rent",
    "utilities",
    "equipment",
    "payroll",
    "marketing",
    "supplies",
    "other_expense",
    name="financial_category",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("income", "expense", name="financial_record_type").create(bind, checkfirst=True)
    postgresql.ENUM("payment", "manual", name="financial_record_source").create(bind, checkfirst=True)
    postgresql.ENUM(
        "session_deposit",
        "order_payment",
        "rental_payment",
        "reservation_deposit",
        "cash_income",
        "other_income",
        "rent",
        "utilities",
        "equipment",
        "payroll",
        "marketing",
        "supplies",
        "other_expense",
        name="financial_category",
    ).create(bind, checkfirst=True)

    op.create_table(
        "financial_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("record_type", financial_record_type, nullable=False),
        sa.Column("source", financial_record_source, nullable=False),
        sa.Column("amount_ghs", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("record_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("category", financial_category, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_label", sa.String(length=255), nullable=True),
        sa.Column("payment_id", sa.UUID(), nullable=True),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("payment_id", name="uq_financial_records_payment_id"),
    )
    op.create_index(op.f("ix_financial_records_category"), "financial_records", ["category"], unique=False)
    op.create_index(op.f("ix_financial_records_record_date"), "financial_records", ["record_date"], unique=False)
    op.create_index(op.f("ix_financial_records_record_type"), "financial_records", ["record_type"], unique=False)
    op.create_index(op.f("ix_financial_records_source"), "financial_records", ["source"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_financial_records_source"), table_name="financial_records")
    op.drop_index(op.f("ix_financial_records_record_type"), table_name="financial_records")
    op.drop_index(op.f("ix_financial_records_record_date"), table_name="financial_records")
    op.drop_index(op.f("ix_financial_records_category"), table_name="financial_records")
    op.drop_table("financial_records")
    bind = op.get_bind()
    postgresql.ENUM(name="financial_category").drop(bind, checkfirst=True)
    postgresql.ENUM(name="financial_record_source").drop(bind, checkfirst=True)
    postgresql.ENUM(name="financial_record_type").drop(bind, checkfirst=True)
