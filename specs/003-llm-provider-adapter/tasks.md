# Tasks: F4 — LLM Provider Adapter

**Input**: Design documents from `specs/003-llm-provider-adapter/`

**Prerequisites**: F1 (Auth) and F3 (Sessions + MessageService) fully implemented. Migration 002 applied.

---

## Phase 1: Setup

**Purpose**: New dependencies, Bot model, and migration. Blocks all user stories.

- [X] T001 Add `anthropic>=0.25.0` and `openai>=1.30.0` to `backend/requirements.txt`
- [X] T002 Extend `backend/src/core/config.py` Settings with `anthropic_api_key: str` and `openai_api_key: str` loaded from env vars `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- [X] T003 Write Alembic migration `003_create_bots_add_bot_fk` in `backend/alembic/versions/003_create_bots_add_bot_fk.py` — creates `bots` table (id, name, description, provider VARCHAR(20) CHECK, model, system_prompt NVARCHAR(MAX), temperature, max_tokens, context_window_tokens, is_active BIT, created_at); adds FK `chat_sessions.bot_id → bots.id`
- [X] T004 Create `Bot` ORM model in `backend/src/models/bot.py` (all columns from data-model.md)
- [X] T005 Extend `backend/src/models/__init__.py` to import `Bot` alongside existing models
- [X] T006 [P] Create `BotOut` schema (public fields only — no system_prompt) in `backend/src/schemas/bot.py`
- [X] T007 [P] Create `ChatRequest` schema (content: str, non-empty) in `backend/src/schemas/chat.py`
- [X] T008 Apply migration: `alembic upgrade head` — verify `bots` table created and `chat_sessions.bot_id` FK active
- [X] T009 Create `backend/src/scripts/seed_bot.py` CLI helper (--name, --provider, --model, --system-prompt args) for creating test bot records

**Checkpoint**: Bot model in DB, API keys loadable from env, schemas defined.

---

## Phase 2: Foundational — Provider Protocol & Factory

**Purpose**: The adapter layer all user stories depend on.

- [X] T010 Create `LLMProvider` Protocol and `LLMProviderConfig` dataclass in `backend/src/providers/base.py` — Protocol defines `async def stream(messages, config) -> AsyncIterator[str]`
- [X] T011 Implement `AnthropicProvider` in `backend/src/providers/anthropic_provider.py` — wraps `anthropic.AsyncAnthropic`; `stream()` yields text delta strings; handles `anthropic.APIError`
- [X] T012 Implement `OpenAIProvider` in `backend/src/providers/openai_provider.py` — wraps `openai.AsyncOpenAI`; `stream()` yields content delta strings; handles `openai.OpenAIError`
- [X] T013 Implement `get_provider(provider_name: str) -> LLMProvider` factory in `backend/src/providers/provider_factory.py` — maps "anthropic" → AnthropicProvider, "openai" → OpenAIProvider; raises `ValueError` for unknown providers

**Checkpoint**: Both providers implemented, factory resolves correctly.

---

## Phase 3: User Story 1 — Stream a Response (Priority: P1) 🎯 MVP

**Goal**: User sends a message, tokens stream back via SSE, assembled response is persisted.

**Independent Test**: POST /sessions/{id}/chat → EventStream emits `token` events → `event: done` → GET /sessions/{id}/messages shows assistant message stored.

### Implementation

- [X] T014 Implement `ChatService` in `backend/src/services/chat_service.py`:
  - `stream_response(session_id, user_id, content, session)` method
  - Validates session ownership (via SessionService.get or get_session_or_404)
  - Loads Bot from DB; validates `is_active=True`
  - Persists user message via `MessageService.add_message`
  - Loads message history from `MessageService.list_messages`
  - Calls `_build_payload(messages, bot)` — injects system prompt, truncates to context_window_tokens (char-based: 1 token ≈ 4 chars)
  - Calls `provider.stream(payload, config)` via `get_provider(bot.provider)`
  - Yields SSE-formatted strings: `event: token\ndata: {...}\n\n`
  - On completion: persists assembled assistant message via `MessageService.add_message`
  - On exception after streaming starts: yields `event: error\ndata: {...}\n\n`; does NOT persist partial message
  - Writes audit log entry: action `llm.invoked`, entity_type `chat_session`, entity_id `session_id`
- [X] T015 Implement per-session concurrency lock in `backend/src/services/chat_service.py` — module-level `dict[str, asyncio.Lock]`; acquire before streaming; release in `finally`; raise `HTTPException(409)` if already locked
- [X] T016 Implement `POST /api/v1/sessions/{session_id}/chat` endpoint in `backend/src/api/v1/chat.py` — returns `StreamingResponse(content=chat_service.stream_response(...), media_type="text/event-stream")`; pre-flight 409 check before returning StreamingResponse
- [X] T017 Mount bots and chat routers in `backend/src/api/v1/router.py`
- [X] T018 Write integration tests for US1 in `backend/tests/integration/test_chat_stream.py` — mock provider with `AsyncMock` yielding test tokens; assert SSE output contains token events and done event; assert assistant message persisted in DB; assert user message persisted before stream starts

**Checkpoint**: Full streaming loop working. Message persisted on completion. Mocked provider tests pass.

---

## Phase 4: User Story 2 — Bot-Specific Context & System Prompt (Priority: P2)

**Goal**: Each bot's system prompt is injected as first message. Config params (temperature, max_tokens) passed to provider. Context window truncation works.

**Independent Test**: Configure two bots with different system prompts; send identical message to each; verify provider receives correct system prompt for each. Verify truncation drops oldest messages when history exceeds context_window_tokens.

### Implementation

- [X] T019 Implement `_build_payload(messages, bot)` helper in `backend/src/services/chat_service.py` — prepends `{"role": "system", "content": bot.system_prompt}`; estimates total tokens (len(content)/4); drops oldest non-system messages until estimated tokens ≤ context_window_tokens; returns final message list
- [X] T020 Pass `temperature`, `max_tokens` from Bot config into `LLMProviderConfig` and forward to provider SDKs in both `AnthropicProvider` and `OpenAIProvider`
- [X] T021 Extend integration tests in `backend/tests/integration/test_chat_stream.py` — assert system prompt appears as first message in provider call; assert context truncation removes oldest messages; assert system prompt is never truncated

**Checkpoint**: System prompt always present. Config params forwarded. Truncation safe.

---

## Phase 5: User Story 3 — Multi-Provider Support & Switchability (Priority: P3)

**Goal**: Bot can be configured for anthropic or openai. Switching requires only a DB change. Unknown provider returns a clear error.

**Independent Test**: Create two bots (one anthropic, one openai), send a message to each, assert the correct provider SDK was called for each. Assert unknown provider returns HTTP error.

### Implementation

- [X] T022 Implement `GET /api/v1/bots` endpoint in `backend/src/api/v1/bots.py` — lists bots user is authorized for (stub: list all active bots for v1 until F2 implements user-bot assignment); returns list of BotOut
- [X] T023 Implement `GET /api/v1/bots/{bot_id}` endpoint in `backend/src/api/v1/bots.py` — returns single BotOut; 404 if not found
- [X] T024 Extend `get_provider` factory in `backend/src/providers/provider_factory.py` to raise `HTTPException(503, "Provider not configured")` if the API key for the resolved provider is not set in settings
- [X] T025 Write integration tests in `backend/tests/integration/test_bots.py` — list bots returns correct items; GET /bots/{id} returns 404 for unknown bot; unknown provider in chat returns 503

**Checkpoint**: Both providers selectable per bot. Missing API key caught cleanly. Bots API usable by F7.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Verify `specs/003-llm-provider-adapter/quickstart.md` steps 5–8 pass against live server with real API key
- [X] T027 [P] Add `.env.example` entry for `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `backend/.env.example`
- [X] T028 [P] Ensure `system_prompt`, `temperature`, `max_tokens`, `context_window_tokens` are excluded from all API responses (verify BotOut schema does not expose them)

---

## Dependencies & Execution Order

- **Phase 1** (T001–T009): No F4 dependencies — but requires F3 MessageService available
- **Phase 2** (T010–T013): Depends on Phase 1 (config available)
- **Phase 3** (T014–T018): Depends on Phase 2 (providers ready) + F3 SessionService + MessageService
- **Phase 4** (T019–T021): Depends on Phase 3 (ChatService exists)
- **Phase 5** (T022–T025): Depends on Phase 1 (Bot model); T022–T023 can run in parallel with Phase 3
- **Phase 6** (T026–T028): Depends on all phases complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T001 (requirements) + T002 (config) + T006 (BotOut schema) + T007 (ChatRequest schema)

# Phase 2 — run in parallel:
T011 (AnthropicProvider) + T012 (OpenAIProvider)

# Phase 5 — T022/T023 (bot list endpoints) can run alongside Phase 3
```

---

## Implementation Strategy

### MVP (Phases 1–3 only)

1. Add deps + config + migration (T001–T009)
2. Build provider protocol + both adapters (T010–T013)
3. Build ChatService with streaming + persistence (T014–T015)
4. Wire SSE endpoint (T016–T017)
5. Test with mocked provider (T018)
6. **STOP and VALIDATE** with real API key via quickstart.md

### Full delivery: add Phase 4 (system prompt) → Phase 5 (multi-provider/bots API) → Phase 6.

---

## Notes

- `StreamingResponse` must be returned immediately; do NOT await the full response before sending headers
- The concurrency lock (T015) must be released in a `finally` block to avoid stuck sessions on exception
- SSE format: each event is `event: <name>\ndata: <json>\n\n` (two newlines to terminate)
- Never log or return provider API keys in any response, error message, or audit log entry
