# Tasks: F3 — Chat Sessions & Persistence

**Input**: Design documents from `specs/002-chat-sessions/`

**Prerequisites**: F1 (Auth) fully implemented and running. Alembic migration 001 applied.

---

## Phase 1: Setup

**Purpose**: Migration and shared schema infrastructure — no user story code can start without this.

- [X] T001 Write Alembic migration `002_create_chat_sessions_messages_audit` in `backend/alembic/versions/002_create_chat_sessions_messages_audit.py` (tables: chat_sessions, chat_messages, audit_logs; indexes; CASCADE delete; GETUTCDATE() defaults; CHECK constraint on role)
- [X] T002 [P] Create `ChatSession` ORM model in `backend/src/models/chat_session.py` (id String(36), user_id, bot_id, name, created_at, updated_at)
- [X] T003 [P] Create `ChatMessage` ORM model in `backend/src/models/chat_message.py` (id String(36), session_id FK cascade, role String(20), content Text, created_at)
- [X] T004 [P] Create `AuditLog` ORM model in `backend/src/models/audit_log.py` (id String(36), user_id, action, entity_type, entity_id, created_at, detail)
- [X] T005 Extend `backend/src/models/__init__.py` to import ChatSession, ChatMessage, AuditLog alongside User and RefreshToken so all relationships resolve on startup
- [X] T006 [P] Create session schemas `SessionCreate`, `SessionOut`, `SessionUpdate`, `SessionListOut` in `backend/src/schemas/session.py`
- [X] T007 [P] Create message schemas `MessageCreate`, `MessageOut`, `MessageListOut` in `backend/src/schemas/message.py`
- [X] T008 Apply migration: `alembic upgrade head` and verify all three tables exist in SQL Server

**Checkpoint**: Migration applied, all models importable, schemas defined — user story work can begin.

---

## Phase 2: Foundational (Blocking Dependency)

**Purpose**: Shared service helper used by all three user stories.

- [X] T009 Add `get_session_or_404(session_id, current_user)` FastAPI dependency to `backend/src/dependencies.py` — queries session filtering by both session_id AND user_id; raises 404 if not found or not owned

**Checkpoint**: Auth-aware session lookup available for all endpoints.

---

## Phase 3: User Story 1 — Create and Start a Chat Session (Priority: P1) 🎯 MVP

**Goal**: Authenticated user creates a session, sends a message, assistant message can be stored. Four-way isolation verified (messages don't cross sessions).

**Independent Test**: POST /sessions → POST /sessions/{id}/messages → GET /sessions/{id}/messages returns message. Two sessions have separate histories.

### Implementation

- [X] T010 Implement `SessionService.create(user_id, bot_id, name, session)` in `backend/src/services/session_service.py` — generates UUID, sets default name if omitted, writes audit_log entry with action `session.created`
- [X] T011 Implement `MessageService.add_message(session_id, role, content, session)` in `backend/src/services/message_service.py` — generates UUID, inserts ChatMessage, updates `chat_sessions.updated_at` in same transaction
- [X] T012 Implement `POST /api/v1/sessions` endpoint in `backend/src/api/v1/sessions.py` — calls SessionService.create; validates user owns the bot (stub: accept any bot_id for now, real auth in F2); returns 201 + SessionOut
- [X] T013 Implement `POST /api/v1/sessions/{session_id}/messages` endpoint in `backend/src/api/v1/sessions.py` — uses get_session_or_404 dep; calls MessageService.add_message; returns 201 + MessageOut
- [X] T014 Mount sessions router in `backend/src/api/v1/router.py` (prefix `/sessions`)
- [X] T015 Write integration tests for US1 in `backend/tests/integration/test_sessions.py`: create session, post user message, post assistant message, verify both retrievable, verify session isolation (two sessions have separate message lists)

**Checkpoint**: Can create sessions and store messages. Session isolation verified. MVP complete.

---

## Phase 4: User Story 2 — List and Resume Sessions (Priority: P2)

**Goal**: User lists their sessions for a bot ordered by recency, loads paginated message history.

**Independent Test**: Create 3 sessions with messages, list sessions → correct order. Load history page 1 of a 120-message session → 50 messages, has_more=true.

### Implementation

- [X] T016 Implement `SessionService.list(user_id, bot_id, session)` in `backend/src/services/session_service.py` — SELECT WHERE user_id=? AND bot_id=? ORDER BY updated_at DESC; returns list
- [X] T017 Implement `SessionService.get(session_id, user_id, session)` in `backend/src/services/session_service.py` — SELECT WHERE id=? AND user_id=? (or rely on get_session_or_404 dep)
- [X] T018 Implement `MessageService.list_messages(session_id, page, page_size, session)` in `backend/src/services/message_service.py` — OFFSET/FETCH, max page_size 200, ORDER BY created_at ASC; returns MessageListOut with total, page, page_size, has_more
- [X] T019 Implement `GET /api/v1/sessions` endpoint in `backend/src/api/v1/sessions.py` — query param `bot_id` required; calls SessionService.list; returns SessionListOut
- [X] T020 Implement `GET /api/v1/sessions/{session_id}` endpoint in `backend/src/api/v1/sessions.py` — uses get_session_or_404; returns SessionOut
- [X] T021 Implement `GET /api/v1/sessions/{session_id}/messages` endpoint in `backend/src/api/v1/sessions.py` — uses get_session_or_404; calls MessageService.list_messages; returns MessageListOut
- [X] T022 Write integration tests for US2 in `backend/tests/integration/test_messages.py`: session list ordering by updated_at, paginated history (page 1 / page 2), empty page beyond last, cross-user 404

**Checkpoint**: Users can list sessions and load paginated history. US1 + US2 both work independently.

---

## Phase 5: User Story 3 — Rename and Delete Sessions (Priority: P3)

**Goal**: User renames a session; new name persists. User deletes a session; record and all messages are gone; audit log entry created.

**Independent Test**: Rename → GET shows new name. Delete → GET returns 404; message list returns 404; audit_logs has `session.deleted` row.

### Implementation

- [X] T023 Implement `SessionService.rename(session_id, user_id, new_name, session)` in `backend/src/services/session_service.py` — UPDATE chat_sessions SET name=?, updated_at=? WHERE id=? AND user_id=?
- [X] T024 Implement `SessionService.delete(session_id, user_id, session)` in `backend/src/services/session_service.py` — DELETE chat_sessions (CASCADE removes messages); writes audit_log entry with action `session.deleted`
- [X] T025 Implement `PATCH /api/v1/sessions/{session_id}` endpoint in `backend/src/api/v1/sessions.py` — uses get_session_or_404; calls SessionService.rename; returns updated SessionOut
- [X] T026 Implement `DELETE /api/v1/sessions/{session_id}` endpoint in `backend/src/api/v1/sessions.py` — uses get_session_or_404; calls SessionService.delete; returns 204
- [X] T027 Extend `backend/tests/integration/test_sessions.py` with US3 tests: rename persists, delete removes session + messages, delete writes audit log, cross-user delete returns 404

**Checkpoint**: All three user stories functional. Full CRUD on sessions. Audit trail present.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Add page_size server-enforcement (clamp to max 200) in `MessageService.list_messages` and add test
- [X] T029 [P] Verify all steps in `specs/002-chat-sessions/quickstart.md` pass end-to-end against running server
- [X] T030 [P] Update `backend/tests/conftest.py` with fixtures for chat_session and chat_message if not already present

---

## Dependencies & Execution Order

- **Phase 1** (T001–T008): No dependencies — start immediately
- **Phase 2** (T009): Depends on T005 (models imported)
- **Phase 3** (T010–T015): Depends on Phases 1+2 complete
- **Phase 4** (T016–T022): Depends on Phase 3 complete (needs existing session data structure)
- **Phase 5** (T023–T027): Depends on Phase 3 (session must exist to rename/delete)
- **Phase 6** (T028–T030): Depends on all phases complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T002 ChatSession model
T003 ChatMessage model
T004 AuditLog model
T006 Session schemas
T007 Message schemas

# Phase 3 — sequential within story:
T010 (SessionService.create) → T012 (POST /sessions)
T011 (MessageService.add_message) → T013 (POST /sessions/{id}/messages)
T012 + T013 → T014 (mount router) → T015 (integration tests)
```

---

## Implementation Strategy

### MVP (Phase 1–3 only)

1. Apply migration (T001, T008)
2. Create models + schemas in parallel (T002–T007)
3. Add auth dependency (T009)
4. Implement create session + add message services (T010–T011)
5. Wire up endpoints + router (T012–T014)
6. Test isolation (T015)
7. **STOP and VALIDATE** via quickstart.md steps 1–4

### Full delivery: add Phase 4 → 5 → 6 incrementally.

---

## Notes

- Every query touching sessions or messages MUST include `user_id` from JWT — never trust client-supplied user_id
- `bot_id` FK constraint is deferred until F4 migration; validate at service layer for now
- All timestamps in UTC (`datetime.now(timezone.utc)`)
- Use `uuid.uuid4()` for all ID generation, convert to `str` before storing
