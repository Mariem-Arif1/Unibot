# API Contracts: Agent Selection with Business Central Tools

**Phase**: 1 — Design
**Date**: 2026-06-03

---

## Modified Endpoints

### `GET /api/v1/bots`

Response adds `agent_type` field to each bot item.

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Promo & Discounts",
      "description": "Build data-grounded promotional and discount propositions using live Business Central data.",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "is_active": true,
      "agent_type": "promo_discount"
    },
    {
      "id": "uuid",
      "name": "General Assistant",
      "description": "General-purpose AI assistant.",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "is_active": true,
      "agent_type": null
    }
  ]
}
```

### `GET /api/v1/bots/{bot_id}`

Same change: adds `agent_type` to response. No breaking change (additive field).

---

## SSE Stream — `POST /api/v1/sessions/{session_id}/chat`

Existing event types are unchanged. Two new event types are added.

### Existing events (unchanged)

```
event: token
data: {"token": "Hello"}

event: done
data: {"id": "msg-uuid", "session_id": "...", "role": "assistant", "content": "...", "created_at": "..."}

event: session_name
data: {"session_id": "...", "name": "Promo proposal for Item X", "is_saved": true}

event: error
data: {"message": "..."}
```

### New events (agents with tools only)

```
event: tool_call
data: {"tool": "select_bc_table", "args": {"table_name": "Item", "filters": [{"column": "Unit Price", "op": ">", "value": 100}]}}

event: tool_result
data: {"tool": "select_bc_table", "row_count": 15, "success": true}
```

**Ordering guarantee**: A `tool_call` event is always followed by exactly one `tool_result` event before the next `tool_call` or `token` event.

**Stream lifecycle for a tool-using agent**:
```
→ [tool_call]       agent decided to call a tool
→ [tool_result]     tool executed, result fed back to LLM
→ (repeat 0-N more tool rounds)
→ [token] [token] … final text answer streams
→ [done]            complete
```

---

## No New Endpoints

All agent interactions go through the existing session + chat endpoints. No new REST endpoints are required for v1.
