# Data Model: Admin Agent Management

**Feature**: 005-admin-agent-management
**Date**: 2026-06-11

## Entities

### Bot (existing — no schema changes)

All required columns already exist in the `bots` table. No migrations needed.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `VARCHAR(36)` | No | UUID, app-generated |
| `name` | `VARCHAR(255)` | No | Display name |
| `description` | `VARCHAR(1000)` | Yes | Optional summary |
| `provider` | `VARCHAR(20)` | No | `"anthropic"` or `"openai"` |
| `model` | `VARCHAR(100)` | No | Provider model ID |
| `system_prompt` | `TEXT` | No | Default: `"You are a helpful assistant."` |
| `temperature` | `FLOAT` | No | 0.0–1.0; Default: `0.7` |
| `max_tokens` | `INT` | No | Default: `1024` |
| `context_window_tokens` | `INT` | No | Default: `4000` |
| `is_active` | `BIT` | No | `true` = visible to end users |
| `agent_type` | `VARCHAR(50)` | Yes | `NULL` = generic; `"promo_discount"` = BC tools |
| `created_at` | `DATETIME` | No | Server default: `GETUTCDATE()` |

### Validation Rules

| Field | Rule |
|-------|------|
| `name` | Required, 1–255 characters |
| `provider` | Required, must be `"anthropic"` or `"openai"` |
| `model` | Required, 1–100 characters |
| `system_prompt` | Required, non-empty |
| `temperature` | Float, 0.0 ≤ value ≤ 1.0 |
| `max_tokens` | Integer, > 0 |
| `context_window_tokens` | Integer, > 0 |
| `agent_type` | Optional; if provided must be a recognized value |
| `description` | Optional, max 1000 characters |

### State Transitions

```
Created (is_active=true)
  │
  ├─[Admin deactivates]──► Inactive (is_active=false)
  │                               │
  │                               └─[Admin activates]──► Created (is_active=true)
  │
  └─[Admin deletes]──► Deleted (row removed from DB permanently)
```

## Pydantic Schemas (backend)

### `BotCreate`

Used for `POST /api/v1/admin/bots`.

```python
class BotCreate(BaseModel):
    name: str
    description: str | None = None
    provider: str                      # validated: "anthropic" | "openai"
    model: str
    system_prompt: str = "You are a helpful assistant."
    temperature: float = 0.7
    max_tokens: int = 1024
    context_window_tokens: int = 4000
    agent_type: str | None = None
    is_active: bool = True
```

### `BotUpdate`

Used for `PUT /api/v1/admin/bots/{id}`. All fields optional — only provided fields are updated.

```python
class BotUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    provider: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    context_window_tokens: int | None = None
    agent_type: str | None = None
    is_active: bool | None = None
```

### `BotAdminOut`

Returned by all admin endpoints. Full field set — never returned by user-facing endpoints.

```python
class BotAdminOut(BaseModel):
    id: str
    name: str
    description: str | None
    provider: str
    model: str
    system_prompt: str
    temperature: float
    max_tokens: int
    context_window_tokens: int
    is_active: bool
    agent_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

## TypeScript Types (frontend)

### `BotAdmin`

Used only in admin-scoped components and services.

```typescript
export interface BotAdmin {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  context_window_tokens: number;
  is_active: boolean;
  agent_type: string | null;
  created_at: string;
}
```

### `BotCreatePayload` / `BotUpdatePayload`

```typescript
export interface BotCreatePayload {
  name: string;
  description?: string | null;
  provider: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  context_window_tokens?: number;
  agent_type?: string | null;
  is_active?: boolean;
}

export type BotUpdatePayload = Partial<BotCreatePayload>;
```
