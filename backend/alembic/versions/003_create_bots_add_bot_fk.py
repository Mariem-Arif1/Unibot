"""create bots table and add FK from chat_sessions.bot_id

Revision ID: 003
Revises: 002
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bots",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="1024"),
        sa.Column("context_window_tokens", sa.Integer(), nullable=False, server_default="4000"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.CheckConstraint("provider IN ('anthropic', 'openai')", name="ck_bots_provider"),
    )

    # Add FK from chat_sessions.bot_id → bots.id (deferred from migration 002)
    op.create_foreign_key(
        "fk_chat_sessions_bot_id",
        "chat_sessions", "bots",
        ["bot_id"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_chat_sessions_bot_id", "chat_sessions", type_="foreignkey")
    op.drop_table("bots")
