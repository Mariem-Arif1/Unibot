"""create chat_sessions, chat_messages, audit_logs tables

Revision ID: 002
Revises: 001
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- chat_sessions ---
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("bot_id", sa.String(36), nullable=False),  # FK to bots added in migration 003
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
    )
    op.create_index("IX_chat_sessions_user_bot", "chat_sessions", ["user_id", "bot_id", "updated_at"])
    op.create_index("IX_chat_sessions_user_id", "chat_sessions", ["user_id"])

    # --- chat_messages ---
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "session_id",
            sa.String(36),
            sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_chat_messages_role"),
    )
    op.create_index("IX_chat_messages_session_created", "chat_messages", ["session_id", "created_at"])

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.Column("detail", sa.String(1000), nullable=True),
    )
    op.create_index("IX_audit_logs_user_created", "audit_logs", ["user_id", "created_at"])
    op.create_index("IX_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
