# API Contract: Chat Sessions & Messages

**Feature**: F3 — Chat Sessions & Persistence
**Base path**: `/api/v1`
**Auth**: All endpoints require a valid `aivora_access` httpOnly cookie (set by F1 login).
**User identity**: Resolved from the JWT cookie — never passed in the request body.

---

## Sessions

### POST /sessions

Create a new chat session for the authenticated user and a given bot.

**Request body**:
```json
{
  "bot_id": "string (UUID)",
  "name": "string (optional, max 255 chars)"
}
```

**Response 201**:
```json
{
  "id": "string (UUID)",
  "user_id": "string (UUID)",
  "bot_id": "string (UUID)",
  "name": "string",
  "created_at": "ISO 8601 UTC datetime",
  "updated_at": "ISO 8601 UTC datetime"
}
```

**Errors**:
- `401` — not authenticated
- `403` — user does not have access to the requested bot
- `422` — validation error (missing bot_id, name too long)

---

### GET /sessions

List all chat sessions for the authenticated user and a specific bot, ordered by `updated_at` descending.

**Query parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| bot_id | string (UUID) | yes | — | Filter sessions by bot |

**Response 200**:
```json
{
  "items": [
    {
      "id": "string (UUID)",
      "bot_id": "string (UUID)",
      "name": "string",
      "created_at": "ISO 8601 UTC datetime",
      "updated_at": "ISO 8601 UTC datetime"
    }
  ],
  "total": 42
}
```

**Errors**:
- `401` — not authenticated
- `422` — bot_id missing

---

### GET /sessions/{session_id}

Get a single session's metadata.

**Response 200**:
```json
{
  "id": "string (UUID)",
  "user_id": "string (UUID)",
  "bot_id": "string (UUID)",
  "name": "string",
  "created_at": "ISO 8601 UTC datetime",
  "updated_at": "ISO 8601 UTC datetime"
}
```

**Errors**:
- `401` — not authenticated
- `404` — session not found or does not belong to current user

---

### PATCH /sessions/{session_id}

Rename a session.

**Request body**:
```json
{
  "name": "string (required, max 255 chars)"
}
```

**Response 200**: Same shape as GET /sessions/{session_id}

**Errors**:
- `401` — not authenticated
- `404` — session not found or does not belong to current user
- `422` — name missing or too long

---

### DELETE /sessions/{session_id}

Delete a session and all its messages permanently.

**Response 204**: No content

**Errors**:
- `401` — not authenticated
- `404` — session not found or does not belong to current user

---

## Messages

### GET /sessions/{session_id}/messages

Get paginated message history for a session, ordered by `created_at` ascending (oldest first).

**Query parameters**:
| Param | Type | Required | Default | Max | Description |
|-------|------|----------|---------|-----|-------------|
| page | integer | no | 1 | — | 1-indexed page number |
| page_size | integer | no | 50 | 200 | Messages per page |

**Response 200**:
```json
{
  "items": [
    {
      "id": "string (UUID)",
      "session_id": "string (UUID)",
      "role": "user | assistant",
      "content": "string",
      "created_at": "ISO 8601 UTC datetime"
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 50,
  "has_more": true
}
```

**Errors**:
- `401` — not authenticated
- `404` — session not found or does not belong to current user
- `422` — invalid pagination params

---

### POST /sessions/{session_id}/messages

Persist a message to a session. Used for both user messages (submitted by the chat UI) and assistant messages (stored by F4 after streaming completes).

**Request body**:
```json
{
  "role": "user | assistant",
  "content": "string (required, non-empty)"
}
```

**Response 201**:
```json
{
  "id": "string (UUID)",
  "session_id": "string (UUID)",
  "role": "user | assistant",
  "content": "string",
  "created_at": "ISO 8601 UTC datetime"
}
```

**Side effect**: `session.updated_at` is updated to `now()`.

**Errors**:
- `401` — not authenticated
- `404` — session not found or does not belong to current user
- `422` — invalid role or empty content

---

## Security Notes

- All session and message queries filter by `user_id` (from JWT) AND the resource's own ID.
- `bot_id` access is validated against the user's bot authorization list on session creation.
- Pagination `page_size` is server-enforced to a maximum of 200.
