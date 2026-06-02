# UI Component Contracts: Web Application UI

**Feature**: F7 — Web Application UI
**Date**: 2026-06-01

---

## Page Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/login` | `LoginPage` | No | Email/password login form |
| `/bots` | `BotsPage` | Yes | Grid/list of assigned bots |
| `/bots/[botId]` | `ChatPage` | Yes | Full chat interface for a bot |

**Middleware** (`middleware.ts`): Redirects unauthenticated requests from `/bots/**` to `/login`.

---

## LoginPage

**Route**: `(auth)/login/page.tsx`

**Behaviour**:
- Shows email input, password input, submit button
- Calls `POST /api/v1/auth/login`
- On success: redirects to `/bots`
- On failure: shows inline error message (no page reload)
- While submitting: button disabled with loading indicator

**Props**: None (page component)

---

## BotsPage

**Route**: `(protected)/bots/page.tsx`

**Behaviour**:
- Fetches `GET /api/v1/bots` via SWR
- Renders a grid of `BotCard` components
- If no bots: shows empty state ("No bots assigned to your account")
- Shows user's display_name and logout button in header

**Child components**: `BotCard`, `AppHeader`

---

## BotCard

**File**: `components/bots/BotCard.tsx`

**Props**:
```typescript
interface BotCardProps {
  bot: Bot;
  onClick: (botId: string) => void;
}
```

**Renders**: Bot name, description (truncated to 2 lines), provider badge (Anthropic/OpenAI).

---

## ChatPage

**Route**: `(protected)/bots/[botId]/page.tsx`

**Behaviour**:
- Three-panel layout: `AppHeader` | `SessionSidebar` | `ChatArea`
- On mobile: sidebar in a `Sheet` (drawer), toggled by header button
- On load: fetches sessions for (user, bot), opens the most recent session
- "New Chat" button in sidebar header creates a new session

**Child components**: `SessionSidebar`, `ChatArea`, `AppHeader`

---

## SessionSidebar

**File**: `components/sessions/SessionSidebar.tsx`

**Props**:
```typescript
interface SessionSidebarProps {
  botId: string;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}
```

**Behaviour**:
- Lists `SessionListItem` components, ordered by `updated_at` desc
- Highlights active session
- Each item has a context menu (three-dot or right-click): Rename, Delete
- Rename: inline text input on the session name, confirmed on Enter/blur
- Delete: opens `DeleteConfirmDialog`

---

## SessionListItem

**File**: `components/sessions/SessionListItem.tsx`

**Props**:
```typescript
interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}
```

---

## ChatArea

**File**: `components/chat/ChatArea.tsx`

**Props**:
```typescript
interface ChatAreaProps {
  sessionId: string | null;
}
```

**Behaviour**:
- Fetches message history via `GET /sessions/{id}/messages` (paginated, page_size=50)
- Renders `MessageBubble` for each message
- Auto-scrolls to bottom on new messages
- Shows `StreamingBubble` while `isStreaming === true`
- "Load earlier messages" button at top when `has_more === true`
- Shows empty state when no messages exist

---

## MessageBubble

**File**: `components/chat/MessageBubble.tsx`

**Props**:
```typescript
interface MessageBubbleProps {
  message: ChatMessage | OptimisticMessage;
}
```

**Renders**:
- User messages: right-aligned, primary colour background
- Assistant messages: left-aligned, neutral background, Markdown rendered
- Optimistic messages: slightly faded opacity
- Error state: red border with retry affordance (v1: just shows error text)

---

## StreamingBubble

**File**: `components/chat/StreamingBubble.tsx`

**Props**:
```typescript
interface StreamingBubbleProps {
  content: string;          // Accumulated tokens so far
  isWaiting: boolean;       // True before first token arrives (show typing indicator)
}
```

**Renders**: Animated cursor at end of content. If `isWaiting`, shows three-dot typing animation.

---

## MessageInput

**File**: `components/chat/MessageInput.tsx`

**Props**:
```typescript
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;        // True while streaming
  placeholder?: string;
}
```

**Behaviour**:
- Textarea that auto-expands up to 5 rows
- Submit on Enter (new line with Shift+Enter)
- Send button (icon button)
- Disabled with visual feedback while `disabled === true`

---

## DeleteConfirmDialog

**File**: `components/sessions/DeleteConfirmDialog.tsx`

**Props**:
```typescript
interface DeleteConfirmDialogProps {
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Renders**: Modal dialog with session name, warning text, Cancel and Delete buttons.

---

## AppHeader

**File**: `components/layout/AppHeader.tsx`

**Props**:
```typescript
interface AppHeaderProps {
  user: User;
  onMenuToggle?: () => void;    // Mobile only: toggles sidebar drawer
}
```

**Renders**: App name/logo, display_name, logout button. On mobile: hamburger menu button.
