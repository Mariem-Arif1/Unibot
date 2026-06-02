# Research: Web Application UI

**Feature**: F7 — Web Application UI
**Date**: 2026-06-01

---

## Decision 1: Framework — Next.js 14 App Router

**Decision**: Next.js 14 with the App Router (`app/` directory), React 18, TypeScript.

**Rationale**: Already established in F1's plan and partially scaffolded (login page, protected routes, middleware). Continuing with the same framework avoids divergence. App Router's server components enable fast initial page loads; client components handle interactive chat UI.

**Alternatives considered**:
- Pages Router (legacy Next.js): No advantage; the App Router is already in use.
- Vite + React SPA: Loses Next.js middleware for auth redirection; would require rewriting F1 frontend.

---

## Decision 2: SSE Client for Streaming

**Decision**: Use the browser native `EventSource` API wrapped in a custom hook (`useChat`). For POST-based SSE (the `/chat` endpoint uses POST, not GET), use `fetch` with `ReadableStream` / manual SSE parsing, since `EventSource` only supports GET.

**Rationale**: The chat endpoint is `POST /sessions/{id}/chat` (body contains message content). `EventSource` only supports GET requests. `fetch` with `response.body.getReader()` provides full control over the stream for POST requests.

**Alternatives considered**:
- `@microsoft/fetch-event-source`: A well-maintained library that handles POST SSE, retries, and reconnects. Adopted for robustness.
- Raw fetch with manual parsing: Works but reinvents error handling; the library handles it better.

---

## Decision 3: State Management

**Decision**: React Context + `useReducer` for session/chat state. No external state library (Redux, Zustand) for v1.

**Rationale**: The chat state (current session, messages, streaming status) is localized to the chat view. Context + useReducer is sufficient and avoids adding a dependency. If state complexity grows (multiple concurrent bots, notifications), Zustand can be introduced later.

**Alternatives considered**:
- Zustand: Lighter than Redux but still an extra dependency for v1 scope.
- SWR/React Query: Good for server state caching (session list, bot list) — adopted for data fetching but not for streaming state.

---

## Decision 4: Data Fetching — SWR

**Decision**: Use `swr` for fetching bot lists and session lists (read-only, cacheable data). Manual `fetch` for mutations (create session, rename, delete, send message).

**Rationale**: SWR handles caching, revalidation, and loading states cleanly for list data. It integrates well with Next.js App Router. Mutations are infrequent and simple enough to be handled with `fetch` + local state updates.

**Alternatives considered**:
- React Query (TanStack Query): More powerful but heavier; SWR is sufficient.
- Server Components with `fetch`: Good for initial load but breaks real-time updates.

---

## Decision 5: Auth Cookie Handling

**Decision**: The httpOnly `aivora_access` cookie (set by F1) is sent automatically with every `fetch` call using `credentials: "include"`. The frontend never reads or stores the JWT. Token refresh is triggered by a 401 response interceptor that calls `POST /api/v1/auth/refresh` before retrying.

**Rationale**: httpOnly cookies cannot be accessed by JavaScript; this is by design for security. The refresh interceptor pattern is the standard approach for silent token renewal without user disruption.

---

## Decision 6: Routing Structure

**Decision**: App Router route groups:
- `(auth)/login/page.tsx` — unauthenticated
- `(protected)/bots/page.tsx` — bot list dashboard
- `(protected)/bots/[botId]/page.tsx` — bot chat view (includes session sidebar)
- `middleware.ts` — redirect unauthenticated requests to `/login`

**Rationale**: Matches the F1 stub structure. Route groups allow shared layouts per auth state without affecting the URL path.

---

## Decision 7: Responsive Layout

**Decision**: Tailwind CSS for styling. Desktop: three-column layout (bot list | session sidebar | chat area). Mobile (< 768px): single column with a drawer/sheet for bot list and session sidebar.

**Rationale**: Tailwind is the de facto standard for Next.js projects and integrates with the shadcn/ui component library. The drawer pattern (using `vaul` or `shadcn Sheet`) is well-established for mobile sidebars.

**Alternatives considered**:
- CSS Modules: More verbose for responsive design; Tailwind is faster to iterate.
- Headless UI: Fewer prebuilt components; shadcn/ui provides more out of the box.

---

## Decision 8: Component Library

**Decision**: `shadcn/ui` (built on Radix UI primitives + Tailwind). Use for: Button, Input, Dialog (delete confirmation), Sheet (mobile drawer), Tooltip, ScrollArea.

**Rationale**: shadcn/ui components are copy-pasted into the project (not a runtime dependency), giving full control. They are accessible (ARIA-compliant) by default. No version lock-in risk.

---

## Decision 9: Message Rendering

**Decision**: Render message content as plain text in v1. Use `react-markdown` with `remark-gfm` for Markdown rendering once the MVP is stable (can be toggled per bot). Code blocks use `react-syntax-highlighter`.

**Rationale**: LLM responses commonly include Markdown (headers, bold, code blocks). Plain text degrades gracefully for v1; Markdown rendering is a quick add-on.

---

## Decision 10: Optimistic UI for User Messages

**Decision**: When the user submits a message, append it to the local message list immediately (before the API confirms). If the API returns an error, show an inline error and remove the optimistic message.

**Rationale**: Eliminates perceived latency for the most common action. The message will always be persisted successfully under normal conditions; failure is rare and recoverable.
