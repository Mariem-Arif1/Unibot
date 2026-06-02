"""add gemini to bots provider constraint

Revision ID: 004
Revises: 003
Create Date: 2026-06-02
"""
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQL Server: drop old constraint then recreate with gemini included
    op.drop_constraint("ck_bots_provider", "bots", type_="check")
    op.create_check_constraint(
        "ck_bots_provider",
        "bots",
        "provider IN ('anthropic', 'openai', 'gemini')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_bots_provider", "bots", type_="check")
    op.create_check_constraint(
        "ck_bots_provider",
        "bots",
        "provider IN ('anthropic', 'openai')",
    )
