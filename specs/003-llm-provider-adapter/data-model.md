# Data Model: LLM Provider Adapter

**Feature**: F4 — LLM Provider Adapter
**Date**: 2026-06-01

---

## Entities

### Bot (LLM configuration extension)

F4 extends the Bot entity that F2 will create. F4 defines the LLM-specific fields. If F2 has not run yet, F4's migration adds a stub `bots` table that F2 will extend.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | String(36) | PK, NOT NULL | UUID generated in Python |
| name | String(255) | NOT NULL | Display name |
| description | String(1000) | NULL | Optional description |
| provider | String(20) | NOT NULL, CHECK IN ('anthropic', 'openai') | LLM vendor |
| model | String(100) | NOT NULL | e.g., `claude-3-5-sonnet-20241022`, `gpt-4o` |
| system_prompt | Text (NVARCHAR MAX) | NOT NULL | Injected as first message in every LLM call |
| temperature | Float | NOT NULL, DEFAULT 0.7 | 0.0–2.0 |
| max_tokens | Integer | NOT NULL, DEFAULT 1024 | Max output tokens |
| context_window_tokens | Integer | NOT NULL, DEFAULT 4000 | History truncation limit (estimated) |
| is_active | Boolean (BIT) | NOT NULL, DEFAULT 1 | Disabled bots cannot be chatted with |
| created_at | DateTime | NOT NULL, default GETUTCDATE() | |

**SQLAlchemy model**: `src/models/bot.py`

**Note**: The `bots` table FK from `chat_sessions.bot_id` (deferred in F3) is added in the F4 migration.

---

### LLMProviderConfig (runtime, not persisted)

This is an in-memory Pydantic model representing the resolved provider settings for a request. Not a DB table.

| Field | Type | Source |
|-------|------|--------|
| provider | str | bot.provider |
| model | str | bot.model |
| api_key | str | env var (ANTHROPIC_API_KEY / OPENAI_API_KEY) |
| system_prompt | str | bot.system_prompt |
| temperature | float | bot.temperature |
| max_tokens | int | bot.max_tokens |
| context_window_tokens | int | bot.context_window_tokens |

---

### StreamChunk (transient SSE event, not persisted)

The shape of each SSE event emitted to the client during streaming.

```
event: token
data: {"content": "<token text>"}

event: done
data: {"total_tokens": 412}

event: error
data: {"message": "Provider rate limit exceeded"}
```

---

## Relationships

```
bots
  └──< chat_sessions   (bot_id → bots.id — FK added in this migration)
  
[In-memory only]
Bot config → LLMProviderConfig (resolved at request time from DB + env)
LLMProviderConfig → Anthropic SDK / OpenAI SDK (provider factory lookup)
```

---

## Alembic Migration

**File**: `backend/alembic/versions/003_create_bots_add_bot_fk.py`

Creates:
1. `bots` table with all LLM config columns
2. Adds FK constraint `chat_sessions.bot_id → bots.id` (fulfilling the deferred FK from F3 migration)

---

## Seed Data

A test bot record is needed for integration tests (and for the quickstart). Added via `scripts/seed_bot.py`:

```python
Bot(
    id="00000000-0000-0000-0000-000000000001",
    name="Test Bot",
    description="Integration test bot",
    provider="anthropic",
    model="claude-3-5-sonnet-20241022",
    system_prompt="You are a helpful assistant.",
    temperature=0.7,
    max_tokens=1024,
    context_window_tokens=4000,
)
```
