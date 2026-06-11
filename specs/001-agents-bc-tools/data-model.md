# Data Model: Agent Selection with Business Central Tools

**Phase**: 1 — Design
**Date**: 2026-06-03
**Feature**: [spec.md](spec.md)

---

## Schema Changes

### `bots` table — add `agent_type` column

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `agent_type` | `VARCHAR(50)` | YES | `NULL` | Identifies the toolset for this agent. `NULL` = no tools (generic chat bot). Valid values: `'promo_discount'` |

**Migration**: `006_add_agent_type_to_bots.py`

No other schema changes. The BC connection string is stored in `.env` only.

---

## Updated SQLAlchemy Model

```python
# backend/src/models/bot.py — add one column
agent_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
```

---

## Updated Pydantic Schemas

```python
# backend/src/schemas/bot.py
class BotOut(BaseModel):
    id: str
    name: str
    description: str | None
    provider: str
    model: str
    is_active: bool
    agent_type: str | None   # NEW

    model_config = {"from_attributes": True}
```

---

## Updated Frontend Type

```typescript
// frontend/src/types/index.ts
export interface Bot {
  id: string;
  name: string;
  description: string | null;
  provider: "anthropic" | "openai" | "gemini";
  model: string;
  is_active: boolean;
  agent_type: string | null;  // NEW
}
```

---

## Tool Call Data Flow (in-memory only, not persisted)

These structures live only in the agentic loop — they are never stored in DB.

### `ToolDefinition` (sent to Anthropic)
```python
{
    "name": "select_bc_table",
    "description": "Query a Business Central table with optional column selection and filters. Returns up to 200 rows as a JSON array.",
    "input_schema": {
        "type": "object",
        "properties": {
            "table_name": {"type": "string", "description": "Exact BC table name (e.g. 'Item', 'Customer')"},
            "columns": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional list of column names to return. Omit for all columns."
            },
            "filters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string"},
                        "op":     {"type": "string", "enum": ["=", "!=", ">", ">=", "<", "<=", "LIKE"]},
                        "value":  {}
                    },
                    "required": ["column", "op", "value"]
                },
                "description": "Optional WHERE conditions. All conditions are ANDed."
            }
        },
        "required": ["table_name"]
    }
}
```

### `ToolResult` (fed back to Anthropic)
```python
{
    "type": "tool_result",
    "tool_use_id": "<id from tool_use block>",
    "content": "<JSON string of rows, or error message>"
}
```

---

## New Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `BC_DATABASE_URL` | Only for promo_discount agent | `mssql+aioodbc://user:pass@host/CRONUS?driver=ODBC+Driver+17+for+SQL+Server` | BC read-only service account |

Add to `backend/.env.example`.

---

## SSE Event Payloads (new events)

### `tool_call` event
Emitted immediately before tool execution begins.
```json
{"tool": "select_bc_table", "args": {"table_name": "Item", "filters": [{"column": "Unit Price", "op": ">", "value": 100}]}}
```

### `tool_result` event
Emitted after tool execution completes.
```json
{"tool": "select_bc_table", "row_count": 15, "success": true}
```
On failure:
```json
{"tool": "select_bc_table", "row_count": 0, "success": false, "error": "Table not found"}
```
