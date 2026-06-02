# API Contract: LLM Provider Adapter

**Feature**: F4 — LLM Provider Adapter
**Base path**: `/api/v1`
**Auth**: All endpoints require a valid `aivora_access` httpOnly cookie (set by F1 login).
**Streaming**: Uses Server-Sent Events (`Content-Type: text/event-stream`).

---

## Chat — Stream a Response

### POST /sessions/{session_id}/chat

Send a user message and receive a streamed LLM response. This endpoint:
1. Validates the user owns the session and the session's bot is active.
2. Persists the user message to the session (via F3 MessageService).
3. Loads the bot configuration and session history.
4. Truncates history to fit the context window.
5. Streams the LLM response token by token.
6. On stream completion: persists the assembled assistant message (via F3 MessageService).

**Request body**:
```json
{
  "content": "string (required, non-empty)"
}
```

**Response**: `Content-Type: text/event-stream`

SSE event stream:

```
event: token
data: {"content": "Hello"}

event: token
data: {"content": ", how"}

event: token
data: {"content": " can I help?"}

event: done
data: {"message_id": "uuid-of-stored-assistant-message", "total_tokens": 8}
```

On provider error after streaming has started:
```
event: error
data: {"message": "Provider rate limit exceeded. Please try again."}
```

**Errors (HTTP, before streaming starts)**:
- `401` — not authenticated
- `403` — user does not own the session, or bot is inactive/unauthorized
- `404` — session not found
- `409` — a streaming response is already in progress for this session
- `422` — content missing or empty
- `503` — provider API key not configured

---

## Bot Management (read-only, for UI)

### GET /bots

List all bots the authenticated user is authorized to use.

**Response 200**:
```json
{
  "items": [
    {
      "id": "string (UUID)",
      "name": "string",
      "description": "string | null",
      "provider": "anthropic | openai",
      "model": "string",
      "is_active": true
    }
  ]
}
```

**Note**: `system_prompt`, `temperature`, `max_tokens`, `context_window_tokens` are NOT returned to clients (server-side configuration only).

**Errors**:
- `401` — not authenticated

---

### GET /bots/{bot_id}

Get a single bot's public details.

**Response 200**: Same shape as a single item from GET /bots.

**Errors**:
- `401` — not authenticated
- `403` — user does not have access to this bot
- `404` — bot not found

---

## Internal Provider Interface (not HTTP — Python protocol)

The adapter layer uses this Python protocol internally. Not exposed as HTTP.

```python
class LLMProvider(typing.Protocol):
    async def stream(
        self,
        messages: list[dict],   # [{"role": "system"|"user"|"assistant", "content": str}]
        config: LLMProviderConfig,
    ) -> AsyncIterator[str]:    # yields token strings
        ...
```

Implementations:
- `src/providers/anthropic_provider.py` — wraps `anthropic.AsyncAnthropic`
- `src/providers/openai_provider.py` — wraps `openai.AsyncOpenAI`
- `src/providers/provider_factory.py` — `get_provider(provider_name: str) -> LLMProvider`

---

## Security Notes

- `system_prompt`, API keys, and temperature settings are NEVER returned to clients.
- `session_id` ownership is validated using user_id from JWT on every call.
- Bot authorization is validated against the user's bot assignment list.
- Provider API keys are loaded from environment variables only, never from DB or request body.
