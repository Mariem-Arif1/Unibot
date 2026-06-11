# Tasks: Agent Selection with Business Central Tools

**Input**: Design documents from `specs/001-agents-bc-tools/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Create the new `tools` package directory structure.

- [x] T001 Create `backend/src/tools/__init__.py` (empty package marker)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema change, model/schema/config/type updates that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create Alembic migration `backend/alembic/versions/006_add_agent_type_to_bots.py` — add nullable `agent_type VARCHAR(50)` column to `bots` table; include downgrade
- [x] T003 [P] Add `agent_type: Mapped[str | None]` column to `backend/src/models/bot.py`
- [x] T004 [P] Add `bc_database_url: str = ""` to `Settings` in `backend/src/core/config.py`; add commented template line to `backend/.env.example`
- [x] T005 [P] Add `agent_type: str | None` field to `BotOut` in `backend/src/schemas/bot.py`
- [x] T006 [P] Add `agent_type: string | null` to the `Bot` interface in `frontend/src/types/index.ts`

**Checkpoint**: Run `alembic upgrade head` — migration applies cleanly. Existing bots work with `agent_type=NULL`.

---

## Phase 3: User Story 1 — Agent Selection UI (Priority: P1) 🎯 MVP

**Goal**: Home page shows agents as purpose-oriented cards — no provider/model jargon — and navigation into a chat session works as before.

**Independent Test**: Open `/bots`. Confirm cards display a category badge (e.g., "Promo & Discounts" or "Assistant") instead of "Anthropic"/"OpenAI". Confirm `bot.model` is no longer shown. Click a card → chat session opens normally.

### Implementation

- [x] T007 [US1] Rewrite `BotCard.tsx` in `frontend/src/components/bots/BotCard.tsx` — replace `PROVIDER_CONFIG` lookup with `AGENT_CATEGORY` map keyed on `bot.agent_type`; add `Tag` icon for `promo_discount`, `MessageSquare` for default; remove `{bot.model}` footer line; keep all hover/click/animation behavior unchanged
- [x] T008 [P] [US1] Update hero copy in `frontend/src/app/(protected)/bots/page.tsx` — change h1 from "Choose your assistant" to "Choose your agent"; update empty-state text from "No bots assigned" to "No agents assigned to your account yet."

**Checkpoint**: Home page renders agent cards with category badges. Zero regressions — clicking a card still navigates to chat.

---

## Phase 4: User Story 3 — `get_bc_tables` Tool (Priority: P2)

**Goal**: Backend tool that queries Business Central's `INFORMATION_SCHEMA.TABLES` and returns a list of available table names.

**Independent Test**: Call `get_bc_tables(conn_str)` directly in a Python REPL / test against a live or mock BC instance — receives a non-empty list of strings. With `BC_DATABASE_URL` unset, function raises a clear `ValueError` or `RuntimeError` (not a crash).

### Implementation

- [x] T009 [US3] Create `backend/src/tools/bc_connection.py` — implement `async def open_bc_connection(dsn: str) -> aioodbc.Connection` using `aioodbc.connect(dsn=dsn, autocommit=True)`; raise `RuntimeError("BC_DATABASE_URL is not configured")` if `dsn` is empty
- [x] T010 [US3] Create `get_bc_tables` function in `backend/src/tools/bc_tools.py` — opens BC connection via `open_bc_connection`, executes `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`, returns `list[str]` of table names, closes connection in `finally` block

**Checkpoint**: `get_bc_tables(conn_str)` returns a list of strings when BC is reachable; returns a clear error when BC is down (no unhandled exception reaches the caller).

---

## Phase 5: User Story 4 — `select_bc_table` Tool (Priority: P2)

**Goal**: Backend tool that runs a safe, parameterized SELECT on a named BC table with optional column selection and WHERE filters; returns up to 200 rows as a JSON string.

**Independent Test**: Call `select_bc_table(conn_str, "Item", columns=["No_", "Description"], filters=[{"column": "Blocked", "op": "=", "value": False}])` — returns a JSON array of dicts. Call with an invalid table name containing SQL special chars — raises `ValueError` before any DB call.

### Implementation

- [x] T011 [US4] Add `select_bc_table` function to `backend/src/tools/bc_tools.py` — validate `table_name` and each column name with `re.match(r'^[A-Za-z0-9_ $]+$', name)`, raising `ValueError` on failure; build `SELECT TOP 200 [col, ...] FROM [table] WHERE col op ? AND ...` with ODBC `?` placeholders for all filter values; allowed ops: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`; execute, fetch rows as list of dicts, return `json.dumps(rows, default=str)`; close connection in `finally`
- [x] T012 [US4] Create `backend/src/tools/registry.py` — define `AgentToolset` dataclass (`definitions: list[dict]`, `executor: Callable[[str, dict], Awaitable[str]]`); define Anthropic tool JSON schemas `GET_BC_TABLES_DEF` and `SELECT_BC_TABLE_DEF` (with full `input_schema`); implement `bc_tool_executor(tool_name, args) -> str` that dispatches to `get_bc_tables` or `select_bc_table`, catches all exceptions and returns `json.dumps({"error": str(e)})` on failure; populate `AGENT_TOOLS: dict[str, AgentToolset]` with `"promo_discount"` entry

**Checkpoint**: `select_bc_table` returns correct filtered rows for valid inputs; rejects invalid table names before any DB call; `bc_tool_executor("select_bc_table", {...})` returns JSON string without raising.

---

## Phase 6: User Story 2 — Agentic Loop + Chat Integration (Priority: P1)

**Goal**: The Promo/Discount agent calls BC tools during a chat session, emits `tool_call`/`tool_result` SSE events so the frontend can show a "looking up data…" indicator, and streams a final grounded text response.

**Independent Test**: With the `promo_discount` bot seeded in DB and `BC_DATABASE_URL` set, send "What items have a unit price above 100?" — observe `tool_call` SSE event, then `tool_result` SSE event, then streamed text tokens, then `done`. Response text references actual items from BC.

**Note**: This phase has a technical dependency on Phases 4 and 5 (US3 + US4 tools) being complete.

### Backend — Provider & Service

- [x] T013 [US2] Extend `LLMProvider` protocol in `backend/src/providers/base.py` — add `stream_with_tools` method signature that accepts `messages`, `config`, and `toolset: AgentToolset`; return type is `AsyncIterator[str | dict]` where `str` is a text token and `dict` is `{"event": "tool_call"|"tool_result", "data": {...}}`
- [x] T014 [US2] Implement `stream_with_tools` in `backend/src/providers/anthropic_provider.py` — agentic loop (max 5 iterations): call `client.messages.create(tools=toolset.definitions, tool_choice={"type": "auto"})` non-streaming; if response contains `tool_use` blocks yield `tool_call` dict, call `toolset.executor`, yield `tool_result` dict, append assistant + tool_result turns to messages, continue loop; when no tool_use blocks remain switch to `client.messages.stream(...)` and yield each text token as a plain `str`
- [x] T015 [US2] Update `_stream_generator` in `backend/src/services/chat_service.py` — after loading bot, check `toolset = AGENT_TOOLS.get(bot.agent_type) if bot.agent_type else None`; if `toolset and bot.provider == "anthropic"` iterate `provider.stream_with_tools(payload, config, toolset)` and dispatch `str` items as `event: token` SSE and `dict` items as their respective SSE event type; else use existing `provider.stream()` path unchanged

### Frontend — Tool Indicator + SSE Handling

- [x] T016 [US2] Create `frontend/src/components/chat/ToolCallIndicator.tsx` — props: `tool: string | null`, `lastResult: { rowCount: number; success: boolean } | null`; while `tool !== null` show a database/search icon with animated "Looking up data in Business Central…" text; when `lastResult` arrives show "Retrieved N rows" (success) or "Data lookup failed" (error) for 2 seconds then unmount via fade; use existing Tailwind + Lucide patterns from adjacent components
- [x] T017 [US2] Add `tool_call` and `tool_result` SSE event listeners in `frontend/src/hooks/useChat.ts`; add `activeToolCall: { tool: string; args: object } | null` and `lastToolResult: { tool: string; rowCount: number; success: boolean } | null` to chat reducer state; add `TOOL_CALL_START` action (sets `activeToolCall`, clears `lastToolResult`) and `TOOL_CALL_END` action (clears `activeToolCall`, sets `lastToolResult`)
- [x] T018 [US2] Mount `ToolCallIndicator` in the streaming message area — find where the streaming bubble is rendered (likely in `frontend/src/components/chat/StreamingBubble.tsx` or equivalent) and render `<ToolCallIndicator tool={activeToolCall?.tool ?? null} lastResult={lastToolResult} />` above it when a session is active

### Seed Data

- [x] T019 [US2] Insert the `promo_discount` agent into the `bots` table via SQL seed script or migration comment in `backend/alembic/versions/006_add_agent_type_to_bots.py` — name "Promo & Discounts", provider "anthropic", model "claude-sonnet-4-6", `agent_type` "promo_discount", with the system prompt defined in plan.md Phase Seed Data section

**Checkpoint**: End-to-end flow works: select agent → chat → tool_call SSE → indicator shows → tool_result SSE → indicator resolves → text streams → done. Generic bots (agent_type=NULL) are unaffected.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Add `BC_DATABASE_URL` commented example and description to `backend/.env.example` if not already added in T004
- [x] T021 [P] Verify `BotSelector` dropdown in `frontend/src/components/chat/BotSelector.tsx` also hides provider/model info — update to show agent category badge consistent with the new `BotCard` style
- [x] T022 Guard against `stream_with_tools` being called on a provider that does not implement it — add a runtime check in `chat_service.py` that falls back to the plain `stream()` path if `not hasattr(provider, "stream_with_tools")`, logging a warning

**Checkpoint**: All four user stories independently testable. Zero regressions confirmed by checking generic bot chat still works.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phase 3 (US1 UI)**: Depends on Phase 2 only — can start as soon as Phase 2 is done
- **Phase 4 (US3 get_bc_tables)**: Depends on Phase 2 — can run in parallel with Phase 3
- **Phase 5 (US4 select_bc_table)**: Depends on Phase 4 (shares `bc_tools.py`)
- **Phase 6 (US2 agentic loop)**: Depends on Phase 4 AND Phase 5 — must complete both tools first
- **Phase 7 (Polish)**: Depends on Phase 3 and Phase 6

### User Story Dependencies

| Story | Phase | Depends on | Notes |
|-------|-------|------------|-------|
| US1 (P1) | Phase 3 | Phase 2 only | Fully independent frontend change |
| US3 (P2) | Phase 4 | Phase 2 only | BC connection + get_bc_tables |
| US4 (P2) | Phase 5 | Phase 4 | Shares bc_tools.py with US3 |
| US2 (P1) | Phase 6 | Phase 4 + Phase 5 | Agentic loop requires both tools |

> **Note**: US2 is spec-priority P1 but has a technical dependency on US3 + US4 (P2). Implement US3 and US4 before US2 even though US2 has higher business priority.

### Within Each Phase

- Tasks marked [P] within the same phase can run in parallel (different files)
- T003, T004, T005, T006 (Phase 2) are all parallel — different files, no cross-dependencies
- T007, T008 (Phase 3) are parallel — different files
- T013, then T014, then T015 (Phase 6 backend) must be sequential — each builds on the previous
- T016 and T017 (Phase 6 frontend) can run in parallel — different files

---

## Parallel Execution Examples

### Phase 2 — run all together
```
T003 Update bot.py model
T004 Update config.py + .env.example
T005 Update schemas/bot.py
T006 Update frontend types/index.ts
```

### Phase 3 — run together
```
T007 Rewrite BotCard.tsx
T008 Update bots/page.tsx copy
```

### Phase 6 frontend — run in parallel after T015
```
T016 Create ToolCallIndicator.tsx
T017 Update useChat.ts SSE handlers
```

---

## Implementation Strategy

### MVP (US1 only — pure frontend, no backend changes beyond migration)

1. Complete Phase 1 + Phase 2 (T001–T006)
2. Complete Phase 3 (T007–T008)
3. **Validate**: Home page shows agent cards. Existing chat unaffected.
4. Ship or demo at this point — the UI speaks "agent" even before tools exist.

### Incremental Delivery

1. Setup + Foundational → migrate DB, update types
2. US1 frontend → agent card UI live
3. US3 + US4 BC tools → tools implemented and testable in isolation
4. US2 agentic loop → full tool-calling chat working end-to-end
5. Polish → cleanup, BotSelector consistency, guard clauses

### Single Developer Order

```
T001 → T002 → T003+T004+T005+T006 (parallel) →
T007+T008 (parallel) →
T009 → T010 →
T011 → T012 →
T013 → T014 → T015 →
T016+T017 (parallel) → T018 → T019 →
T020+T021+T022 (parallel)
```

---

## Notes

- `[P]` tasks touch different files — safe to run in parallel
- `[Story]` label maps each task to its user story for traceability
- No tests are specified — add them if you want TDD coverage
- Commit after each phase checkpoint to keep history clean
- Do **not** skip T002 (migration) — running the backend without `agent_type` column will break `BotOut` serialization after T005
- The BC connection is never pooled — each tool call opens and closes its own connection
