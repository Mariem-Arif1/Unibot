# API Contracts: Admin Agent Management

**Feature**: 005-admin-agent-management
**Date**: 2026-06-11
**Base URL**: `/api/v1/admin`
**Auth**: All endpoints require `aivora_access` cookie with role `"admin"`. Non-admin requests receive `403 Forbidden`.

---

## GET /api/v1/admin/bots

List all bots, including inactive ones.

**Auth**: Admin only

**Request**: No body, no query parameters.

**Response 200**:
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Promo & Discounts",
    "description": "Queries Business Central for promotional data",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "system_prompt": "You are a helpful assistant...",
    "temperature": 0.7,
    "max_tokens": 1024,
    "context_window_tokens": 4000,
    "is_active": true,
    "agent_type": "promo_discount",
    "created_at": "2026-06-01T10:00:00Z"
  }
]
```

**Response 403**: `{ "detail": "Forbidden" }` — caller does not have admin role.

---

## POST /api/v1/admin/bots

Create a new bot.

**Auth**: Admin only

**Request body**:
```json
{
  "name": "My New Agent",
  "description": "Optional description",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "system_prompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "max_tokens": 1024,
  "context_window_tokens": 4000,
  "agent_type": null,
  "is_active": true
}
```

Required fields: `name`, `provider`, `model`.
Optional fields: `description`, `system_prompt` (default: "You are a helpful assistant."), `temperature` (default: 0.7), `max_tokens` (default: 1024), `context_window_tokens` (default: 4000), `agent_type` (default: null), `is_active` (default: true).

**Response 201**: Full `BotAdminOut` object (same shape as GET list item).

**Response 422**: Validation error — missing required field or invalid value.

**Response 403**: Forbidden.

---

## PUT /api/v1/admin/bots/{bot_id}

Partially update an existing bot. Only provided fields are updated.

**Auth**: Admin only

**Path parameter**: `bot_id` — UUID string of the bot to update.

**Request body** (all fields optional):
```json
{
  "name": "Updated Name",
  "is_active": false
}
```

**Response 200**: Updated `BotAdminOut` object.

**Response 404**: `{ "detail": "Bot not found" }` — no bot with that ID.

**Response 422**: Validation error.

**Response 403**: Forbidden.

---

## DELETE /api/v1/admin/bots/{bot_id}

Permanently delete a bot. This action is irreversible.

**Auth**: Admin only

**Path parameter**: `bot_id` — UUID string of the bot to delete.

**Response 204**: No content — deletion successful.

**Response 404**: `{ "detail": "Bot not found" }` — no bot with that ID.

**Response 403**: Forbidden.

---

## Error Response Format

All error responses follow FastAPI's standard format:

```json
{
  "detail": "Human-readable error message"
}
```

Validation errors (422) use the extended format:

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "missing"
    }
  ]
}
```
