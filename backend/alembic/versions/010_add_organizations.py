"""Add organizations table and organization_id FK on users

Revision ID: 010
Revises: 009
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create organizations table
    op.execute(sa.text("""
        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'organizations')
        BEGIN
            CREATE TABLE organizations (
                id              VARCHAR(36)     NOT NULL PRIMARY KEY,
                name            NVARCHAR(200)   NOT NULL,
                bc_company_name NVARCHAR(100)   NOT NULL,
                bc_database_url NVARCHAR(MAX)   NULL,
                is_active       BIT             NOT NULL DEFAULT 1,
                created_at      DATETIME        NOT NULL DEFAULT GETUTCDATE(),
                updated_at      DATETIME        NOT NULL DEFAULT GETUTCDATE()
            )
        END
    """))

    # 2. Index on name for admin lookups
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_organizations_name'
              AND object_id = OBJECT_ID('organizations')
        )
        BEGIN
            CREATE INDEX IX_organizations_name ON organizations (name)
        END
    """))

    # 3. Add organization_id column to users (nullable — existing users unassigned)
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('users') AND name = 'organization_id'
        )
        BEGIN
            ALTER TABLE users ADD organization_id VARCHAR(36) NULL
        END
    """))

    # 4. FK constraint from users.organization_id → organizations.id
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_users_organization_id'
        )
        BEGIN
            ALTER TABLE users
            ADD CONSTRAINT FK_users_organization_id
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        END
    """))

    # 5. Index on users.organization_id for reverse lookups
    op.execute(sa.text("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_users_organization_id'
              AND object_id = OBJECT_ID('users')
        )
        BEGIN
            CREATE INDEX IX_users_organization_id ON users (organization_id)
        END
    """))


def downgrade() -> None:
    # Drop FK and index on users first, then the organizations table

    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_users_organization_id'
              AND object_id = OBJECT_ID('users')
        )
        BEGIN
            DROP INDEX IX_users_organization_id ON users
        END
    """))

    op.execute(sa.text("""
        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_users_organization_id')
        BEGIN
            ALTER TABLE users DROP CONSTRAINT FK_users_organization_id
        END
    """))

    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('users') AND name = 'organization_id'
        )
        BEGIN
            ALTER TABLE users DROP COLUMN organization_id
        END
    """))

    op.execute(sa.text("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_organizations_name'
              AND object_id = OBJECT_ID('organizations')
        )
        BEGIN
            DROP INDEX IX_organizations_name ON organizations
        END
    """))

    op.execute(sa.text("DROP TABLE IF EXISTS organizations"))
