# Tasks: F7 — Web Application UI

**Input**: Design documents from `specs/004-web-chat-ui/`

**Prerequisites**: F1, F3, F4 backend APIs running on `http://localhost:8000`. Frontend scaffold from F1 exists under `frontend/`.

---

## Phase 1: Setup

**Purpose**: Install new dependencies and configure shared infrastructure.

- [X] T001 Install new npm packages: `swr`, `@microsoft/fetch-event-source`, `react-markdown`, `remark-gfm`, `vaul` — run `npm install` in `frontend/`
- [X] T002 Create shared TypeScript interfaces in `frontend/src/types/index.ts` — `User`, `Bot`, `ChatSession`, `ChatMessage`, `OptimisticMessage`, `Paginated<T>`
- [X] T003 Implement `apiClient` in `frontend/src/services/apiClient.ts` — `fetch` wrapper with `credentials: "include"`, 401 interceptor that calls `POST /api/v1/auth/refresh` once and retries, throws typed `ApiError` on failure
- [X] T004 [P] Create `frontend/src/services/botService.ts` — `listBots()`, `getBot(id)` wrapping `GET /api/v1/bots`
- [X] T005 [P] Create `frontend/src/services/sessionService.ts` — `createSession()`, `listSessions()`, `getSession()`, `renameSession()`, `deleteSession()` wrapping F3 endpoints
- [X] T006 [P] Create `frontend/src/services/messageService.ts` — `listMessages(sessionId, page, pageSize)` wrapping `GET /sessions/{id}/messages`
- [X] T007 Create `ChatContext` + `useReducer` in `frontend/src/context/ChatContext.tsx` — state: `currentBot`, `currentSession`, `messages`, `sessions`, `isStreaming`, `streamingContent`, `error`; export `ChatProvider`, `useChatState`, `useChatDispatch`

**Checkpoint**: All services wired, types defined, context available — component work can begin.

---

## Phase 2: Foundational — Shared Layout Components

**Purpose**: App shell used by all pages.

- [X] T008 Implement `AppHeader` in `frontend/src/components/layout/AppHeader.tsx` — logo/app name, `user.display_name`, logout button (calls `POST /api/v1/auth/logout` then redirects to `/login`); mobile: hamburger button that calls `onMenuToggle`
- [X] T009 Extend `frontend/src/middleware.ts` (from F1) to also protect `/bots/[botId]/**` routes — redirect to `/login` if no `aivora_access` cookie

**Checkpoint**: Protected routing and app shell available.

---

## Phase 3: User Story 1 — Authenticate and Access the Platform (Priority: P1) 🎯 MVP

**Goal**: Unauthenticated visit → redirect to login. Valid login → dashboard with bot cards. Invalid credentials → inline error. Session expiry → silent refresh or redirect.

**Independent Test**: Visit `/bots` unauthenticated → redirected to `/login`. Login with valid creds → `/bots` shows bot grid. Login with wrong password → error message visible without page reload.

### Implementation

- [X] T010 Implement full `LoginPage` in `frontend/src/app/(auth)/login/page.tsx` — styled form (email + password inputs, submit button), calls `POST /api/v1/auth/login` via apiClient, on success redirects to `/bots`, on failure shows inline error, button shows loading state during submit
- [X] T011 Implement `BotsPage` in `frontend/src/app/(protected)/bots/page.tsx` — fetches `GET /api/v1/bots` via `useBots` SWR hook; renders grid of `BotCard` components; shows empty state if no bots; shows `AppHeader`
- [X] T012 Implement `useBots` hook in `frontend/src/hooks/useBots.ts` — SWR wrapper for `botService.listBots()`; returns `{ bots, isLoading, error }`
- [X] T013 Implement `BotCard` in `frontend/src/components/bots/BotCard.tsx` — displays bot name, description (2-line clamp), provider badge (Anthropic / OpenAI); clickable, calls `onClick(bot.id)`

**Checkpoint**: Login flow works end-to-end. Bot grid visible after auth. Redirect on unauthenticated access works.

---

## Phase 4: User Story 2 — Browse Bots and Open a Chat Session (Priority: P2)

**Goal**: User clicks a bot → chat view with session sidebar. Existing sessions listed by recency. New Chat creates a session. Clicking a session loads its history.

**Independent Test**: Click a bot → navigate to `/bots/{botId}`. Session sidebar shows prior sessions. Click "New Chat" → empty chat area, new session in sidebar. Click existing session → message history loads.

### Implementation

- [X] T014 Implement `ChatPage` in `frontend/src/app/(protected)/bots/[botId]/page.tsx` — wraps page in `ChatProvider`; three-column layout (desktop) / single-column with Sheet drawer (mobile); renders `AppHeader`, `SessionSidebar`, `ChatArea`
- [X] T015 Implement `SessionSidebar` in `frontend/src/components/sessions/SessionSidebar.tsx` — lists sessions via `useSessions` hook; highlights active session; "New Chat" button at top; each item has three-dot context menu with Rename + Delete actions; mobile: rendered inside `vaul` Sheet/Drawer
- [X] T016 Implement `useSessions` hook in `frontend/src/hooks/useSessions.ts` — SWR wrapper for `sessionService.listSessions(botId)`; returns `{ sessions, isLoading, mutate }`
- [X] T017 Implement `SessionListItem` in `frontend/src/components/sessions/SessionListItem.tsx` — session name, relative time (`updated_at`), active highlight; inline rename input (shown on rename action, confirmed on Enter/blur); three-dot context menu
- [X] T018 Implement `ChatArea` in `frontend/src/components/chat/ChatArea.tsx` — loads history via `useMessages` hook; renders list of `MessageBubble`; "Load earlier" button when `has_more`; auto-scroll to bottom on new messages; empty state when no messages
- [X] T019 Implement `useMessages` hook in `frontend/src/hooks/useMessages.ts` — fetches `messageService.listMessages(sessionId, 1, 50)` via SWR; handles pagination append on "load more"

**Checkpoint**: Full navigation: bot → session sidebar → history loading. New session creation works.

---

## Phase 5: User Story 3 — Send Messages and See Streamed Responses (Priority: P3)

**Goal**: User sends message → appears immediately (optimistic). LLM response streams token by token. Input disabled during stream. Stream complete → input re-enables.

**Independent Test**: Send "Hello" → message appears instantly. Typing indicator shows. Response streams in. Input disabled during stream. After done event, input re-enables. Reload page → history loads correctly.

### Implementation

- [X] T020 Implement `MessageBubble` in `frontend/src/components/chat/MessageBubble.tsx` — user messages: right-aligned, primary bg; assistant: left-aligned, neutral bg, content rendered via `react-markdown` + `remark-gfm`; optimistic messages: reduced opacity; error state: red border + error text
- [X] T021 Implement `StreamingBubble` in `frontend/src/components/chat/StreamingBubble.tsx` — shows accumulated `streamingContent` with blinking cursor; when `isWaiting=true` (no tokens yet) shows three-dot typing animation
- [X] T022 Implement `MessageInput` in `frontend/src/components/chat/MessageInput.tsx` — auto-expanding textarea (max 5 rows); submit on Enter, Shift+Enter for newline; send icon button; `disabled` prop disables both textarea and button with visual feedback
- [X] T023 Implement `useChat` hook in `frontend/src/hooks/useChat.ts` — calls `POST /sessions/{id}/chat` via `@microsoft/fetch-event-source`; on `token` event: dispatches to `streamingContent`; on `done` event: dispatches assembled message to `messages` list + clears `streamingContent` + sets `isStreaming=false`; on `error` event or network failure: shows error in chat + re-enables input; handles optimistic user message (add before fetch, remove on error)
- [X] T024 Wire `useChat` into `ChatArea` and `MessageInput` — pass `onSend` from useChat to MessageInput; render `StreamingBubble` when `isStreaming=true`; disable MessageInput when `isStreaming=true`

**Checkpoint**: Full chat loop working. Optimistic UI, streaming display, and input lock all functional.

---

## Phase 6: User Story 4 — Manage Sessions (Rename, Delete) (Priority: P4)

**Goal**: User renames session inline. User deletes session with confirmation dialog. Both operations update the sidebar immediately.

**Independent Test**: Rename → new name shown in sidebar after page refresh. Delete → session disappears from sidebar, confirmation dialog required.

### Implementation

- [X] T025 Implement `DeleteConfirmDialog` in `frontend/src/components/sessions/DeleteConfirmDialog.tsx` — Radix UI Dialog; shows session name + warning text; Cancel + Delete (destructive) buttons; calls `onConfirm` or `onCancel`
- [X] T026 Wire rename flow in `SessionListItem` — on Rename action: show inline `<input>` pre-filled with session name; on Enter/blur: call `sessionService.renameSession(id, newName)` then `mutate()` (SWR revalidate); on Escape: cancel
- [X] T027 Wire delete flow in `SessionListItem` — on Delete action: open `DeleteConfirmDialog`; on confirm: call `sessionService.deleteSession(id)` then `mutate()` (SWR revalidate); if deleted session is the current session, clear chat area

**Checkpoint**: Session management complete. All four user stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 [P] Responsive layout — verify sidebar collapses to `vaul` Sheet at mobile breakpoints; test on 375px viewport in browser dev tools
- [X] T029 [P] Error boundary — add a top-level error boundary component in `frontend/src/app/error.tsx` (Next.js App Router convention) for unhandled errors
- [X] T030 [P] Loading skeletons — add skeleton placeholders for bot grid and session list while SWR is loading (prevent layout shift)
- [ ] T031 [P] Run through all `specs/004-web-chat-ui/quickstart.md` steps (golden path + mobile + rename/delete + session expiry + error handling)
- [ ] T032 [P] Verify `system_prompt`, `temperature`, provider API keys never appear in browser network tab responses

---

## Dependencies & Execution Order

- **Phase 1** (T001–T007): No dependencies — start immediately
- **Phase 2** (T008–T009): Depends on T003 (apiClient)
- **Phase 3** (T010–T013): Depends on Phase 1+2; F1 backend must be running
- **Phase 4** (T014–T019): Depends on Phase 3 (user must be authenticated); F3 backend must be running
- **Phase 5** (T020–T024): Depends on Phase 4 (session must exist); F4 backend must be running
- **Phase 6** (T025–T027): Depends on Phase 4 (SessionSidebar exists)
- **Phase 7** (T028–T032): Depends on all phases complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T004 (botService) + T005 (sessionService) + T006 (messageService)

# Phase 3+4 — independent leaf components:
T013 (BotCard) can be built alongside T010 (LoginPage)
T017 (SessionListItem) + T018 (ChatArea) can build in parallel in Phase 4

# Phase 5 — sequential within story:
T020 (MessageBubble) + T021 (StreamingBubble) + T022 (MessageInput) [parallel]
→ T023 (useChat hook)
→ T024 (wire into ChatArea)
```

---

## Implementation Strategy

### MVP (Phases 1–3 only)

1. Install deps + types + services + context (T001–T007)
2. Build layout shell + middleware (T008–T009)
3. Build login + bots page (T010–T013)
4. **STOP and VALIDATE**: Login → bots dashboard works

### Full delivery: add Phase 4 (session navigation) → Phase 5 (streaming chat) → Phase 6 (rename/delete) → Phase 7 (polish).

---

## Notes

- `EventSource` only supports GET — use `@microsoft/fetch-event-source` for POST-based SSE
- Optimistic messages need a stable local `id` (e.g., `crypto.randomUUID()`) before the server assigns one
- SWR `mutate()` after session create/rename/delete to keep sidebar in sync without a full page reload
- All `fetch` calls go through `apiClient` to get the 401→refresh interceptor automatically
