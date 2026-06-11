# Tasks: Admin Agent Management

**Input**: Design documents from `specs/005-admin-agent-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Create new file skeletons so parallel foundational tasks don't conflict.

- [x] T001 Create empty `backend/src/api/v1/admin_bots.py` — stub with `router = APIRouter()` only; no endpoints yet
- [x] T002 Create `frontend/src/components/admin/` directory with empty `__placeholder__` (or just confirm via mkdir); create `frontend/src/app/(protected)/admin/agents/new/` and `frontend/src/app/(protected)/admin/agents/[id]/edit/` directory structure

**Checkpoint**: File stubs exist; parallel foundational work can begin without merge conflicts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schemas, router wiring, middleware role guard, frontend types, service layer, and SWR hook — everything every user story depends on.

**⚠️ CRITICAL**: No user story phase can begin until this phase is fully complete.

- [x] T003 Add `BotCreate`, `BotUpdate`, and `BotAdminOut` Pydantic schemas to `backend/src/schemas/bot.py` — `BotCreate` requires name/provider/model, defaults for the rest; `BotUpdate` all-optional; `BotAdminOut` includes system_prompt, temperature, max_tokens, context_window_tokens, created_at; add `model_config = {"from_attributes": True}` to `BotAdminOut`
- [x] T004 [P] Register `admin_bots` router in `backend/src/api/v1/router.py` — import `from src.api.v1 import admin_bots` and add `api_v1_router.include_router(admin_bots.router, prefix="/admin/bots", tags=["admin"])`
- [x] T005 [P] Extend role guard in `frontend/src/middleware.ts` — change `jwtDecode<{ exp: number }>` to `jwtDecode<{ exp: number; role: string }>` and add: if `pathname.startsWith("/admin") && payload.role !== "admin"` redirect to `/bots`; insert this check before the expiry block so it applies even to valid tokens
- [x] T006 [P] Add `BotAdmin`, `BotCreatePayload`, and `BotUpdatePayload` interfaces to `frontend/src/types/index.ts` — `BotAdmin` includes all bot fields (id, name, description, provider, model, system_prompt, temperature, max_tokens, context_window_tokens, is_active, agent_type, created_at); `BotCreatePayload` mirrors BotCreate required+optional; `BotUpdatePayload = Partial<BotCreatePayload>`
- [x] T007 Create `frontend/src/services/adminBotService.ts` — four functions using existing `apiClient`: `listAllBots(): Promise<BotAdmin[]>` → `GET /api/v1/admin/bots`; `createBot(data: BotCreatePayload): Promise<BotAdmin>` → `POST /api/v1/admin/bots`; `updateBot(id: string, data: BotUpdatePayload): Promise<BotAdmin>` → `PUT /api/v1/admin/bots/{id}`; `deleteBot(id: string): Promise<void>` → `DELETE /api/v1/admin/bots/{id}`
- [x] T008 Create `frontend/src/hooks/useAdminBots.ts` — SWR hook `useAdminBots()` calling `adminBotService.listAllBots()`; returns `{ bots: BotAdmin[], isLoading: boolean, error: unknown, mutate: KeyedMutator }`

**Checkpoint**: Run backend — `GET /api/v1/admin/bots` returns 403 for non-admin tokens (router wired, auth guard active). Frontend types compile with no errors.

---

## Phase 3: User Story 1 — View All Agents (Priority: P1) 🎯 MVP

**Goal**: Admin navigates to `/admin/agents` and sees a full table of all agents (active + inactive). Non-admins are redirected to `/bots`.

**Independent Test**: Log in as admin → navigate to `/admin/agents` → table renders with all agents. Log in as regular user → navigate to `/admin/agents` → immediately redirected to `/bots`.

### Implementation

- [x] T009 [US1] Implement `GET /admin/bots` endpoint in `backend/src/api/v1/admin_bots.py` — `Depends(require_role(UserRole.admin))`, `select(Bot)` with no `is_active` filter, return `[BotAdminOut.model_validate(b) for b in bots]`
- [x] T010 [P] [US1] Create `frontend/src/components/admin/AgentTable.tsx` — HTML `<table>` with Tailwind styling; columns: Name, Provider, Model, Agent Type badge (show "Generic" if null), Status pill (green "Active" / gray "Inactive"), Actions cell (Edit button — placeholder click for now; Activate/Deactivate button — placeholder; Delete button — placeholder); accepts `bots: BotAdmin[]` prop
- [x] T011 [US1] Create `frontend/src/app/(protected)/admin/layout.tsx` — `"use client"`; on mount decode `aivora_access` cookie using `jwtDecode`; if role is not `"admin"` call `router.replace("/bots")`; render `<AppHeader />` + `{children}`
- [x] T012 [US1] Create `frontend/src/app/(protected)/admin/agents/page.tsx` — `"use client"`; calls `useAdminBots()`; shows loading skeleton while `isLoading`; renders `<AgentTable bots={bots} />`; "Create Agent" button top-right (navigates to `/admin/agents/new` — placeholder, not wired yet)

**Checkpoint**: Admin sees the full agent list at `/admin/agents`. Non-admins are redirected. Empty state shows when no agents exist.

---

## Phase 4: User Story 2 — Create a New Agent (Priority: P1)

**Goal**: Admin clicks "Create Agent", fills the full form, submits — new agent appears in the list.

**Independent Test**: As admin, navigate to `/admin/agents/new`, fill all required fields, submit — redirected to `/admin/agents` showing the new agent in the table.

### Implementation

- [x] T013 [US2] Implement `POST /admin/bots` endpoint in `backend/src/api/v1/admin_bots.py` — `Depends(require_role(UserRole.admin))`, create `Bot(**payload.model_dump())`, `db.add(bot)`, `await db.commit()`, `await db.refresh(bot)`, return `BotAdminOut.model_validate(bot)` with status 201
- [x] T014 [P] [US2] Create `frontend/src/components/admin/AgentForm.tsx` — controlled form; props: `initialValues?: BotAdmin`, `onSubmit(data: BotCreatePayload): Promise<void>`, `isSubmitting: boolean`, `submitLabel: string`; fields: name (text, required), description (textarea, optional), provider (select: "anthropic"→"Anthropic" / "openai"→"OpenAI", required), model (text, required), system_prompt (textarea 8 rows, required), temperature (range 0–1 step 0.1 with numeric readout, default 0.7), max_tokens (number, default 1024), context_window_tokens (number, default 4000), agent_type (select driven by `AGENT_TYPE_OPTIONS = [{ value: "", label: "Generic Assistant" }, { value: "promo_discount", label: "Promo & Discounts" }]`), is_active (checkbox/toggle, default true); client-side validation: show inline error for empty required fields on submit attempt; when `initialValues` provided pre-fill all fields
- [x] T015 [US2] Create `frontend/src/app/(protected)/admin/agents/new/page.tsx` — `"use client"`; renders `<AgentForm submitLabel="Create Agent">`; `onSubmit` calls `adminBotService.createBot(data)` then `router.push("/admin/agents")`; shows spinner on `isSubmitting`
- [x] T016 [US2] Wire "Create Agent" button in `frontend/src/app/(protected)/admin/agents/page.tsx` — replace placeholder click handler with `router.push("/admin/agents/new")`

**Checkpoint**: Full create flow works end-to-end. New agents appear in the list immediately after save. Required field validation prevents empty submits.

---

## Phase 5: User Story 3 — Edit an Existing Agent (Priority: P2)

**Goal**: Admin clicks Edit on any agent, updates fields, saves — changes persist and are visible in the list.

**Independent Test**: From `/admin/agents`, click Edit on any agent → pre-filled form opens at `/admin/agents/{id}/edit` → change system prompt → save → redirected to list → re-open edit form → updated value shown.

### Implementation

- [x] T017 [US3] Implement `PUT /admin/bots/{bot_id}` endpoint in `backend/src/api/v1/admin_bots.py` — `Depends(require_role(UserRole.admin))`, fetch bot by id (404 if missing), apply only non-None fields from `BotUpdate` via `for field, value in payload.model_dump(exclude_none=True).items(): setattr(bot, field, value)`, commit + refresh, return `BotAdminOut.model_validate(bot)`
- [x] T018 [US3] Create `frontend/src/app/(protected)/admin/agents/[id]/edit/page.tsx` — `"use client"`; SWR fetches `GET /api/v1/admin/bots/{id}` via `adminBotService`; add `getBot(id: string): Promise<BotAdmin>` to `adminBotService.ts`; once loaded renders `<AgentForm initialValues={bot} submitLabel="Save Changes">`; `onSubmit` calls `adminBotService.updateBot(id, data)` then `router.push("/admin/agents")`
- [x] T019 [US3] Wire Edit button in `frontend/src/components/admin/AgentTable.tsx` — replace placeholder with `router.push(\`/admin/agents/${bot.id}/edit\`)`; add `onEdit?: (bot: BotAdmin) => void` prop or inline router call

**Checkpoint**: Edit flow works. Changes persist across page reloads. Clearing a required field and saving shows inline validation error.

---

## Phase 6: User Story 4 — Deactivate or Delete an Agent (Priority: P3)

**Goal**: Admin can deactivate (reversible) or permanently delete an agent from the list. Both require confirmation.

**Independent Test**: Deactivate an active agent → status pill changes to "Inactive" → agent gone from `/bots`. Activate it → reappears on `/bots`. Delete an agent via confirmation dialog → row removed from admin list permanently.

### Implementation

- [x] T020 [US4] Implement `DELETE /admin/bots/{bot_id}` endpoint in `backend/src/api/v1/admin_bots.py` — `Depends(require_role(UserRole.admin))`, fetch bot by id (404 if missing), `await db.delete(bot)`, `await db.commit()`, return `Response(status_code=204)`
- [x] T021 [P] [US4] Create `frontend/src/components/admin/DeleteAgentDialog.tsx` — Radix UI `<Dialog>`; props: `open: boolean`, `agentName: string`, `onConfirm(): void`, `onCancel(): void`, `isDeleting: boolean`; body: agent name in bold + "This action cannot be undone." warning; Cancel button + red "Delete" button (disabled + spinner when `isDeleting`)
- [x] T022 [US4] Wire Activate/Deactivate toggle in `frontend/src/components/admin/AgentTable.tsx` — replace placeholder; on click call `adminBotService.updateBot(bot.id, { is_active: !bot.is_active })` then `mutate()` (passed as prop from page); button label: "Deactivate" when active, "Activate" when inactive
- [x] T023 [US4] Wire Delete button in `frontend/src/components/admin/AgentTable.tsx` — replace placeholder; on click open `<DeleteAgentDialog>`; on confirm call `adminBotService.deleteBot(bot.id)` then `mutate()`; pass `mutate` from `useAdminBots` down to `AgentTable` as prop

**Checkpoint**: Full lifecycle works. Deactivate/activate toggles status. Delete removes the row after confirmation. Closing the dialog without confirming cancels the action.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T024 [P] Add conditional "Admin" nav link to `frontend/src/components/layout/AppHeader.tsx` — on mount decode `aivora_access` cookie; if `role === "admin"` render `<Link href="/admin/agents">Admin</Link>` in the header nav; use same `jwtDecode` import already in the file
- [x] T025 [P] Add `getBot` to `frontend/src/services/adminBotService.ts` if not added in T018 — `getBot(id: string): Promise<BotAdmin>` → `GET /api/v1/admin/bots/{id}` (needed by edit page SWR call)
- [x] T026 [P] Add inline success/error feedback on form submit in `frontend/src/components/admin/AgentForm.tsx` — on success briefly show a "Saved" confirmation before redirect; on API error show the error message above the submit button
- [x] T027 Run through all `specs/005-admin-agent-management/quickstart.md` scenarios — golden path create, edit, deactivate, delete, access control (non-admin redirect), and sensitive field isolation (system_prompt absent from `GET /api/v1/bots` response)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 (T003, T004, T006, T007, T008 complete)
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 2; benefits from Phase 4 (AgentForm exists)
- **Phase 6 (US4)**: Depends on Phase 2; benefits from Phase 3 (AgentTable exists)
- **Phase 7 (Polish)**: Depends on Phases 3–6 complete

### User Story Dependencies

| Story | Phase | Hard Depends On | Soft Benefit From |
|-------|-------|-----------------|-------------------|
| US1 — View List (P1) | Phase 3 | Phase 2 | — |
| US2 — Create (P1) | Phase 4 | Phase 2 | Phase 3 (table shows new agent) |
| US3 — Edit (P2) | Phase 5 | Phase 2 | Phase 4 (AgentForm reuse) |
| US4 — Deactivate/Delete (P3) | Phase 6 | Phase 2 | Phase 3 (AgentTable wiring) |

### Within Each Phase

- T003, T004, T005, T006 (Phase 2) — all parallel, different files
- T009, T010, T011 (Phase 3) — parallel; T012 waits for all three
- T013, T014 (Phase 4) — parallel; T015 waits for T014; T016 waits for T015
- T017 (Phase 5 backend) — parallel with T018; T019 waits for T018
- T020, T021 (Phase 6) — parallel; T022 and T023 wait for T021

---

## Parallel Execution Examples

### Phase 2 — run all together
```
T003 Extend bot schemas
T004 Register admin router
T005 Extend middleware role guard
T006 Add BotAdmin types
```
Then sequentially:
```
T007 adminBotService (needs T006)
T008 useAdminBots hook (needs T007)
```

### Phase 3 — run T009/T010/T011 in parallel, then T012
```
T009 Backend GET endpoint
T010 AgentTable component
T011 Admin layout
→ T012 Agents list page (needs all three)
```

### Phase 4 — run T013/T014 in parallel
```
T013 Backend POST endpoint
T014 AgentForm component
→ T015 New agent page (needs T014)
→ T016 Wire "Create" button (needs T015)
```

### Phase 6 — run T020/T021 in parallel
```
T020 Backend DELETE endpoint
T021 DeleteAgentDialog component
→ T022 Wire activate/deactivate (needs T010 from Phase 3)
→ T023 Wire delete button (needs T021)
```

---

## Implementation Strategy

### MVP (Phase 1 + Phase 2 + Phase 3 only)

1. Complete Phase 1: Setup stubs
2. Complete Phase 2: Foundational (schemas, router, middleware, types, service, hook)
3. Complete Phase 3: US1 — View All Agents
4. **STOP and VALIDATE**: Admin can list all agents. Non-admins are blocked. Backend 403 works.
5. Demo or deploy at this point — a read-only admin view is already useful.

### Full Delivery (incremental)

1. Setup + Foundational → run backend, confirm 403 on non-admin
2. US1 → admin list page working
3. US2 → create agent working (highest business value)
4. US3 → edit agent working
5. US4 → deactivate/delete working
6. Polish → nav link, feedback toasts, quickstart verification

### Single Developer Order

```
T001 → T002 →
T003 + T004 + T005 + T006 (parallel) →
T007 → T008 →
T009 + T010 + T011 (parallel) → T012 →
T013 + T014 (parallel) → T015 → T016 →
T017 + T018 (parallel) → T019 →
T020 + T021 (parallel) → T022 → T023 →
T024 + T025 + T026 (parallel) → T027
```

---

## Notes

- `[P]` tasks touch different files — safe to run in parallel
- `[Story]` label maps each task to its user story for traceability
- No tests are specified — add them if TDD coverage is desired
- Deactivation reuses the `PUT` endpoint (set `is_active: false`) — no separate endpoint needed
- `BotAdmin` type is admin-only; do not import it in non-admin components (keeps T032 sensitive-field isolation intact)
- The `mutate` function from `useAdminBots` must be threaded down to `AgentTable` so the list refreshes after activate/deactivate/delete without a page reload
- `getBot(id)` for the edit page SWR call may be added in T018 or T025 — mark whichever comes first as the canonical location
