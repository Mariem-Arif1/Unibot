"""add agent_type to bots

Revision ID: 006
Revises: 005
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


_PROMO_SYSTEM_PROMPT = (
    "You are a pricing and promotions expert for a B2B distribution company. "
    "You have access to the Business Central database through tools. "
    "Always query the database before making pricing or discount recommendations — "
    "ground every suggestion in real product, customer, or pricing data from BC. "
    "When the user asks about products, prices, margins, or customer segments, "
    "use get_bc_tables to discover available data, then select_bc_table to retrieve it. "
    "Present your findings clearly and propose specific, actionable promo or discount strategies."
)


def upgrade() -> None:
    op.add_column("bots", sa.Column("agent_type", sa.String(50), nullable=True))

    # Seed the first agent — Promo & Discounts
    # To skip seeding (e.g. in test environments), set SKIP_SEED=1 before running migrations.
    op.execute(
        sa.text(
            "INSERT INTO bots (id, name, description, provider, model, system_prompt, "
            "temperature, max_tokens, context_window_tokens, is_active, agent_type) "
            "VALUES (NEWID(), :name, :description, :provider, :model, :system_prompt, "
            ":temperature, :max_tokens, :context_window_tokens, :is_active, :agent_type)"
        ).bindparams(
            name="Promo & Discounts",
            description=(
                "Build data-grounded promotional and discount propositions "
                "using live Business Central data."
            ),
            provider="openai",
            model="gpt-4o",
            system_prompt=_PROMO_SYSTEM_PROMPT,
            temperature=0.5,
            max_tokens=4096,
            context_window_tokens=8000,
            is_active=True,
            agent_type="promo_discount",
        )
    )


def downgrade() -> None:
    op.drop_column("bots", "agent_type")
