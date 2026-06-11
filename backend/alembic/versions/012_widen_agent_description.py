"""Widen agents.description to TEXT

Revision ID: 012
Revises: 011
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        ALTER TABLE agents
        ALTER COLUMN description NVARCHAR(MAX) NULL
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        ALTER TABLE agents
        ALTER COLUMN description NVARCHAR(500) NULL
    """))
