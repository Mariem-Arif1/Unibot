"""Create llm_configs table

Revision ID: 011
Revises: 010
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'llm_configs')
        BEGIN
            CREATE TABLE llm_configs (
                id                    VARCHAR(36)    NOT NULL PRIMARY KEY,
                name                  NVARCHAR(100)  NOT NULL,
                description           NVARCHAR(500)  NULL,
                provider              VARCHAR(20)    NOT NULL,
                model                 VARCHAR(100)   NOT NULL,
                api_key               NVARCHAR(500)  NULL,
                max_tokens            INT            NOT NULL DEFAULT 1024,
                context_window_tokens INT            NOT NULL DEFAULT 4000,
                temperature           FLOAT          NOT NULL DEFAULT 0.7,
                is_active             BIT            NOT NULL DEFAULT 1,
                bot_id                VARCHAR(36)    NULL,
                created_at            DATETIME       NOT NULL DEFAULT GETUTCDATE(),
                updated_at            DATETIME       NOT NULL DEFAULT GETUTCDATE(),
                CONSTRAINT FK_llm_configs_bot_id
                    FOREIGN KEY (bot_id) REFERENCES agents(id) ON DELETE SET NULL
            )
        END
    """))

    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_llm_configs_bot_id'
              AND object_id = OBJECT_ID('llm_configs')
        )
        BEGIN
            CREATE INDEX IX_llm_configs_bot_id ON llm_configs (bot_id)
        END
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_llm_configs_bot_id'
              AND object_id = OBJECT_ID('llm_configs')
        )
        BEGIN
            DROP INDEX IX_llm_configs_bot_id ON llm_configs
        END
    """))

    op.execute(sa.text("DROP TABLE IF EXISTS llm_configs"))
