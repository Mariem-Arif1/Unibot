# Data Model: Web Application UI

**Feature**: F7 — Web Application UI
**Date**: 2026-06-01

---

## Frontend Data Shapes

No new database tables are introduced by F7. The frontend consumes the REST APIs defined in F1, F3, and F4.

---

## TypeScript Interfaces (frontend types)

### User (from F1 JWT payload)

```typescript
interface User {
  id: string;           // UUID
  email: string;
  display_name: string;
  role: "admin" | "user";
  is_active: boolean;
}
```

**Source**: Decoded from the `GET /api/v1/users/me` response after login.

---

### Bot (from F4 GET /bots)

```typescript
interface Bot {
  id: string;           // UUID
  name: string;
  description: string | null;
  provider: "anthropic" | "openai";
  model: string;
  is_active: boolean;
}
```

---

### ChatSession (from F3 GET /sessions)

```typescript
interface ChatSession {
  id: string;           // UUID
  bot_id: string;       // UUID
  name: string;
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
}
```

---

### ChatMessage (from F3 GET /sessions/{id}/messages)

```typescript
interface ChatMessage {
  id: string;           // UUID
  session_id: string;   // UUID
  role: "user" | "assistant";
  content: string;
  created_at: string;   // ISO 8601
}

// Optimistic message (not yet persisted)
interface OptimisticMessage extends ChatMessage {
  isOptimistic: true;
  isError?: boolean;
}
```

---

### Paginated response wrapper

```typescript
interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}
```

---

## Client-Side State

Managed with React Context + useReducer — not persisted to the server.

```typescript
interface ChatState {
  currentBot: Bot | null;
  currentSession: ChatSession | null;
  messages: (ChatMessage | OptimisticMessage)[];
  sessions: ChatSession[];
  isStreaming: boolean;
  streamingContent: string;   // accumulates current token stream
  error: string | null;
}
```

---

## API Client Layer

```typescript
// src/services/apiClient.ts
// Thin fetch wrapper that:
// - adds credentials: "include"
// - intercepts 401 → calls /auth/refresh → retries once
// - throws typed ApiError on failure

// src/services/sessionService.ts — wraps F3 endpoints
// src/services/chatService.ts   — wraps F4 SSE streaming endpoint
// src/services/botService.ts    — wraps F4 /bots endpoints
```
