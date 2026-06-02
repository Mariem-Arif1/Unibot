# Data Model: Chat Sessions & Persistence

**Feature**: F3 — Chat Sessions & Persistence
**Date**: 2026-06-01

---

## Entities

### ChatSession

Represents a single named conversation thread between one user and one bot.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | String(36) | PK, NOT NULL | UUID generated in Python (uuid4) |
| user_id | String(36) | NOT NULL, FK → users.id | Index for list queries |
| bot_id | String(36) | NOT NULL | No FK constraint until F2 ships |
| name | String(255) | NOT NULL | Defaults to "New Chat <timestamp>" if omitted |
| created_at | DateTime | NOT NULL, default GETUTCDATE() | UTC only |
| updated_at | DateTime | NOT NULL, default GETUTCDATE() | Updated on every message insert |

**Indexes**:
- `IX_chat_sessions_user_bot` on `(user_id, bot_id, updated_at DESC)` — supports list-by-user-bot ordered by recency
- `IX_chat_sessions_user_id` on `(user_id)` — supports user-level lookups

**SQLAlchemy model**: `src/models/chat_session.py`

---

### ChatMessage

A single message within a chat session.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | String(36) | PK, NOT NULL | UUID generated in Python (uuid4) |
| session_id | String(36) | NOT NULL, FK → chat_sessions.id ON DELETE CASCADE | Cascade delete when session is removed |
| role | String(20) | NOT NULL, CHECK IN ('user', 'assistant') | Enforced at DB and Pydantic layers |
| content | Text (NVARCHAR MAX) | NOT NULL | Full message text; no size limit |
| created_at | DateTime | NOT NULL, default GETUTCDATE() | UTC only; used for ordering |

**Indexes**:
- `IX_chat_messages_session_created` on `(session_id, created_at ASC)` — supports paginated history in chronological order

**SQLAlchemy model**: `src/models/chat_message.py`

---

### AuditLog

Platform-wide audit trail. F3 writes entries for session creation and deletion.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | String(36) | PK, NOT NULL | UUID generated in Python (uuid4) |
| user_id | String(36) | NOT NULL | Actor (from JWT) |
| action | String(50) | NOT NULL | e.g., `session.created`, `session.deleted` |
| entity_type | String(50) | NOT NULL | e.g., `chat_session` |
| entity_id | String(36) | NOT NULL | The affected entity's id |
| created_at | DateTime | NOT NULL, default GETUTCDATE() | UTC only |
| detail | String(1000) | NULL | Optional JSON-serialized detail (e.g., session name) |

**Indexes**:
- `IX_audit_logs_user_created` on `(user_id, created_at DESC)`
- `IX_audit_logs_entity` on `(entity_type, entity_id)`

**SQLAlchemy model**: `src/models/audit_log.py`

---

## Relationships

```
users (F1)
  └──< chat_sessions      (user_id → users.id)
          └──< chat_messages   (session_id → chat_sessions.id, CASCADE DELETE)

[bots table - F2, not yet created]
  └──< chat_sessions      (bot_id → bots.id — FK added in F2 migration)

users (F1)
  └──< audit_logs         (user_id — no FK constraint, loose reference)
```

---

## Alembic Migration

**File**: `backend/alembic/versions/002_create_chat_sessions_messages_audit.py`

Creates:
1. `chat_sessions` table
2. `chat_messages` table with ON DELETE CASCADE to `chat_sessions`
3. `audit_logs` table
4. All indexes listed above

Uses `GETUTCDATE()` for server defaults (SQL Server).
