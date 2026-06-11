"""fix hashed_password column from TEXT to VARCHAR(72)

Revision ID: 007
Revises: 006
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "hashed_password",
        type_=sa.String(72),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "hashed_password",
        type_=sa.Text(),
        existing_nullable=False,
    )
