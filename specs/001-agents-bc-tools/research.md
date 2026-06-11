# Research: Agent Selection with Business Central Tools

**Phase**: 0 — Pre-design research
**Date**: 2026-06-03
**Feature**: [spec.md](spec.md)

---

## Decision 1: Agentic Loop Pattern

**Decision**: Non-streaming for tool-execution rounds, streaming only for the final text response.

**Rationale**: Anthropic's `messages.create()` (non-streaming) returns complete content blocks including `tool_use` blocks synchronously. This simplifies parsing — no need to reassemble streaming deltas for tool inputs. Once all tool rounds complete, the final reply is streamed as normal so the user sees tokens appearing. This gives the user near-realtime feedback on the text answer without complicating the tool-execution phase.

**Alternatives considered**:
- Full streaming with tool-call delta parsing: more complex, requires reassembling `input_json_delta` fragments, no practical UX benefit for tool-selection rounds which are fast (< 500 ms).
- Fully non-streaming (return everything at once): poor UX — user sees nothing until the entire response is built.

---

## Decision 2: Tool Registry Architecture

**Decision**: A static registry mapping `agent_type` string → list of Anthropic tool definitions + an async executor function.

```python
# registry.py
AGENT_TOOLS: dict[str, AgentToolset] = {
    "promo_discount": AgentToolset(
        definitions=[GET_BC_TABLES_DEF, SELECT_BC_TABLE_DEF],
        executor=bc_tool_executor,
    )
}
```

**Rationale**: Simple, fast, no DB round-trip for tool config. New agent types are added by registering a new entry — no schema changes. The `agent_type` column on the bot record is the only DB field needed to activate a toolset.

**Alternatives considered**:
- Store tool definitions in DB (JSONB/Text): more flexible but adds complexity, migrations, and admin UI for tool management — overkill for v1.
- Plugin/discovery system: premature abstraction for 1–2 agent types.

---

## Decision 3: Business Central Connection

**Decision**: Separate `BC_DATABASE_URL` environment variable; connection is opened per-request (no persistent pool) using the existing `aioodbc` driver already present in the project.

**Rationale**: BC is a read-only data source queried occasionally (per tool call). A persistent pool would hold connections unnecessarily. The project already uses `aioodbc` for the app DB, so no new driver is needed. Credentials stay in `.env` only — never in the bots table.

**Connection string format** (same as app DB, just pointing to BC instance):
```
mssql+aioodbc://BC_USER:BC_PASS@BC_HOST/BC_DB?driver=ODBC+Driver+17+for+SQL+Server
```

For tool use we open a raw `aioodbc` connection (not SQLAlchemy ORM) since we're running arbitrary SELECT queries, not mapped models.

**Alternatives considered**:
- SQLAlchemy ORM for BC: not suitable — we don't have BC entity models and don't want to create them.
- pyodbc (sync): would block the async event loop; aioodbc is the async equivalent already in use.

---

## Decision 4: BC Query Safety

**Decision**: Enforce a hard 200-row `TOP` limit at the SQL level (injected server-side), whitelist only `SELECT` statements, and reject any query containing DDL keywords (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `EXEC`, `TRUNCATE`).

**Rationale**: The LLM generates filter arguments; those arguments must never reach the DB as raw SQL. We use parameterized queries for all filter values. The row cap prevents accidental token-budget overflow.

**Filter parameter format** (what the LLM passes to `select_bc_table`):
```json
{
  "table_name": "Item",
  "columns": ["No_", "Description", "Unit Price"],
  "filters": [
    {"column": "Unit Price", "op": ">", "value": 100},
    {"column": "Blocked", "op": "=", "value": false}
  ]
}
```
Allowed `op` values: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`.

**Alternatives considered**:
- Allow the LLM to write raw SQL WHERE clauses: high injection risk, rejected.
- No row limit: could flood context window with thousands of rows, rejected.

---

## Decision 5: SSE Events for Tool Activity

**Decision**: Emit two new SSE event types during a tool-calling round so the frontend can show a "looking up data…" indicator:

| Event | Payload | When |
|-------|---------|------|
| `tool_call` | `{"tool": "select_bc_table", "args": {...}}` | Before tool execution starts |
| `tool_result` | `{"tool": "select_bc_table", "row_count": 15, "success": true}` | After tool execution completes |

**Rationale**: Without these events, the user would see a long silent pause while the agent calls BC and processes results. The events give enough info to show a meaningful inline indicator without exposing raw query results in the SSE stream.

**Alternatives considered**:
- Include raw result data in SSE: too large, not needed in frontend.
- Show nothing during tool calls: poor UX for queries taking 1–3 seconds.

---

## Decision 6: Frontend Agent Card Redesign

**Decision**: Replace the provider badge (Anthropic/OpenAI) with an agent-category icon and color. Keep the card component but remove `bot.model` from the footer; add a `category` visual derived from `agent_type`.

**Agent type → category mapping** (frontend-only, derived from `agent_type`):

| agent_type | Icon | Color | Label |
|------------|------|-------|-------|
| `promo_discount` | `Tag` (lucide) | indigo | Promo & Discounts |
| `null` / generic | `MessageSquare` | blue | Assistant |

**Rationale**: Users should see business purpose, not infrastructure details. The provider/model information is irrelevant to end users.

---

## Decision 7: Backward Compatibility

**Decision**: `agent_type = NULL` means no tools — existing bots work exactly as today. The `chat_service` checks `if bot.agent_type and bot.agent_type in AGENT_TOOLS` to decide the execution path.

**Rationale**: Zero regression — existing sessions, message history, and provider logic are untouched for bots without an `agent_type`.
