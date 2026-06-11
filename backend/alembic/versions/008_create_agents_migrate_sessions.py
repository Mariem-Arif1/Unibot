"""create agents table and migrate chat_sessions.bot_id -> agent_id

Revision ID: 008
Revises: 007
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

# Fixed UUID for the seeded "Promo & Discounts" agent so migration is idempotent
PROMO_AGENT_ID = "c1a2b3d4-e5f6-7890-abcd-ef1234567801"

PROMO_SYSTEM_PROMPT = (
    "You are a Promo & Discount Proposition specialist. "
    "Your role is to help users create compelling promotional and discount offers "
    "for products and clients by querying the Business Central (BC) database. "
    "Use the available tools to look up product data, pricing, and customer segments "
    "from BC before making recommendations. Always ground your suggestions in real data."
)


def upgrade() -> None:
    # 1. Create agents table (skip if already exists from partial run)
    op.execute(sa.text("""
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'agents')
        BEGIN
            CREATE TABLE agents (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description VARCHAR(500) NULL,
                agent_type VARCHAR(50) NULL,
                system_prompt NVARCHAR(MAX) NOT NULL,
                temperature FLOAT NOT NULL DEFAULT 0.7,
                max_tokens INT NOT NULL DEFAULT 1024,
                context_window_tokens INT NOT NULL DEFAULT 4000,
                is_active BIT NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
                updated_at DATETIME NOT NULL DEFAULT GETUTCDATE()
            )
        END
    """))

    # 2. Seed the Promo & Discounts agent (skip if already seeded)
    op.execute(sa.text("""
        IF NOT EXISTS (SELECT 1 FROM agents WHERE id = :id)
        BEGIN
            INSERT INTO agents (id, name, description, agent_type, system_prompt,
                temperature, max_tokens, context_window_tokens, is_active)
            VALUES (:id, :name, :desc, :agent_type, :system_prompt, 0.7, 2048, 8000, 1)
        END
    """).bindparams(
        id=PROMO_AGENT_ID,
        name="Promo & Discounts",
        desc="Creates promotional and discount propositions grounded in Business Central data.",
        agent_type="promo_discount",
        system_prompt=PROMO_SYSTEM_PROMPT,
    ))

    # 3. Add agent_id column if it doesn't exist yet
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('chat_sessions') AND name = 'agent_id'
        )
        BEGIN
            ALTER TABLE chat_sessions ADD agent_id VARCHAR(36) NULL
        END
    """))

    # 4. Populate agent_id for any rows that don't have it yet
    op.execute(sa.text(
        "UPDATE chat_sessions SET agent_id = :agent_id WHERE agent_id IS NULL"
    ).bindparams(agent_id=PROMO_AGENT_ID))

    # 5. Make agent_id NOT NULL
    op.execute(sa.text(
        "ALTER TABLE chat_sessions ALTER COLUMN agent_id VARCHAR(36) NOT NULL"
    ))

    # 6. Add FK constraint if it doesn't exist yet
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys
            WHERE name = 'FK_chat_sessions_agent_id'
        )
        BEGIN
            ALTER TABLE chat_sessions
            ADD CONSTRAINT FK_chat_sessions_agent_id
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        END
    """))

    # 7. Drop the index on bot_id BEFORE dropping the column
    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_chat_sessions_user_bot'
              AND object_id = OBJECT_ID('chat_sessions')
        )
        BEGIN
            DROP INDEX IX_chat_sessions_user_bot ON chat_sessions
        END
    """))

    # 8. Drop FK constraint on bot_id (find by column, not by name)
    op.execute(sa.text("""
        DECLARE @fk NVARCHAR(255);
        SELECT @fk = fk.name
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.columns c ON fkc.parent_object_id = c.object_id
            AND fkc.parent_column_id = c.column_id
        JOIN sys.tables t ON fk.parent_object_id = t.object_id
        WHERE t.name = 'chat_sessions' AND c.name = 'bot_id';
        IF @fk IS NOT NULL
            EXEC('ALTER TABLE chat_sessions DROP CONSTRAINT [' + @fk + ']');
    """))

    # 9. Drop bot_id column if it still exists
    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('chat_sessions') AND name = 'bot_id'
        )
        BEGIN
            ALTER TABLE chat_sessions DROP COLUMN bot_id
        END
    """))

    # 10. Create new index on agent_id
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_chat_sessions_user_agent'
              AND object_id = OBJECT_ID('chat_sessions')
        )
        BEGIN
            CREATE INDEX IX_chat_sessions_user_agent
            ON chat_sessions (user_id, agent_id, updated_at)
        END
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_chat_sessions_user_agent'
              AND object_id = OBJECT_ID('chat_sessions')
        )
        BEGIN
            DROP INDEX IX_chat_sessions_user_agent ON chat_sessions
        END
    """))

    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('chat_sessions') AND name = 'bot_id'
        )
        BEGIN
            ALTER TABLE chat_sessions ADD bot_id VARCHAR(36) NULL
        END
    """))
    op.execute(sa.text("UPDATE chat_sessions SET bot_id = agent_id"))
    op.execute(sa.text("ALTER TABLE chat_sessions ALTER COLUMN bot_id VARCHAR(36) NOT NULL"))

    op.execute(sa.text("""
        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_chat_sessions_agent_id')
            ALTER TABLE chat_sessions DROP CONSTRAINT FK_chat_sessions_agent_id
    """))

    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('chat_sessions') AND name = 'agent_id'
        )
        BEGIN
            ALTER TABLE chat_sessions DROP COLUMN agent_id
        END
    """))

    op.execute(sa.text("DROP TABLE IF EXISTS agents"))
