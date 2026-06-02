# Feature Specification: Chat Sessions & Persistence

**Feature Branch**: `002-chat-sessions`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "F3 - Chat Sessions & Persistence for Aivora platform."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Start a Chat Session (Priority: P1)

A user authenticated to the platform selects one of their assigned bots and starts a new chat session. They can optionally give the session a name (e.g., "Q2 Budget Analysis") or let the system assign a default name. Once created, the session is immediately available for sending messages.

**Why this priority**: Core capability — without session creation, no chat can occur. Everything else depends on this.

**Independent Test**: Can be tested by calling the "create session" endpoint, verifying it returns a session ID, then sending one message and confirming it is stored and retrievable.

**Acceptance Scenarios**:

1. **Given** an authenticated user with access to bot B, **When** they create a new session with an optional name, **Then** a session record is created with a unique ID, the provided name (or a default), and the current timestamp.
2. **Given** a session was created, **When** a user sends a message in that session, **Then** the message is stored with role "user", content, and timestamp, associated to the session.
3. **Given** a session was created, **When** an assistant response is persisted (by F4), **Then** the message is stored with role "assistant", content, and timestamp, associated to the same session.
4. **Given** two different sessions for the same user-bot pair, **When** messages are sent to each, **Then** each session's message history contains only its own messages.

---

### User Story 2 - List and Resume Sessions (Priority: P2)

A user returns to the platform and sees a list of all their chat sessions for a given bot, ordered by most recent activity. They pick an existing session to continue, and the message history loads so they can read context and continue the conversation.

**Why this priority**: Critical for persistence value — users must be able to find and resume prior conversations.

**Independent Test**: Can be tested by creating two sessions, sending messages to each, listing sessions for the user-bot pair, and confirming they appear in recency order with correct metadata.

**Acceptance Scenarios**:

1. **Given** a user has three sessions with bot B, **When** they list sessions for bot B, **Then** all three sessions are returned ordered by `updated_at` descending.
2. **Given** a user resumes a session with 120 messages, **When** they load the message history with page 1 (default 50), **Then** they receive the 50 most recent messages and a pagination indicator showing more are available.
3. **Given** a session belonging to user A, **When** user B (different user) attempts to load it, **Then** the system refuses with an authorization error.

---

### User Story 3 - Rename and Delete Sessions (Priority: P3)

A user can rename a session to something descriptive or delete sessions they no longer need. Deletion is permanent and removes all associated messages.

**Why this priority**: Quality-of-life feature that keeps the session list manageable. Not blocking for core usage.

**Independent Test**: Can be tested by creating a session, renaming it, confirming the new name is returned in the list, then deleting it and confirming it no longer appears.

**Acceptance Scenarios**:

1. **Given** an existing session named "Session 1", **When** the user renames it to "Tax Report Chat", **Then** subsequent list/get calls return the updated name.
2. **Given** an existing session with 50 messages, **When** the user deletes it, **Then** both the session record and all its messages are removed, and an audit log entry is created.
3. **Given** a session belonging to user A, **When** user B attempts to delete it, **Then** the system refuses with an authorization error.

---

### Edge Cases

- What happens when a user tries to access a session for a bot they are no longer authorized to use? → Session access is denied even if the session exists.
- What happens when paginating beyond the last page? → Return empty list with total count.
- What happens when the name field is omitted on create? → System assigns a default name (e.g., "New Chat" + creation timestamp).
- What happens when deleting a session that does not exist? → Return 404.
- What happens when two concurrent requests try to send messages to the same session simultaneously? → Both messages are stored independently; no message is lost.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authenticated user to create a new chat session for a (user, bot) pair, with an optional name.
- **FR-002**: System MUST list all sessions for a (user, bot) pair, ordered by `updated_at` descending.
- **FR-003**: System MUST load paginated message history for a given session (default page size 50, configurable).
- **FR-004**: System MUST allow users to rename an existing session they own.
- **FR-005**: System MUST allow users to delete a session they own, permanently removing all associated messages.
- **FR-006**: System MUST persist each user message immediately when submitted, associated to the correct session.
- **FR-007**: System MUST persist assistant messages when provided by the LLM layer (F4), associated to the correct session.
- **FR-008**: Session access MUST be restricted to the owning user — all queries MUST filter by both `session_id` and `user_id`.
- **FR-009**: System MUST create an audit log entry on session creation and deletion.
- **FR-010**: System MUST update `session.updated_at` whenever a new message is added to the session.
- **FR-011**: System MUST support the user having multiple simultaneous sessions per bot.
- **FR-012**: Session listing and message history MUST be accessible without loading full message content in the list view (only metadata).

### Key Entities

- **ChatSession**: Represents a single conversation thread between a user and a bot. Stores: id, user_id, bot_id, name, created_at, updated_at.
- **ChatMessage**: A single message within a session. Stores: id, session_id, role (user/assistant), content (text), created_at.
- **Bot**: Referenced by session (bot_id). Defined in a separate feature (F2); F3 only references bot_id without owning the Bot entity.
- **AuditLog**: Records session lifecycle events (create, delete) with actor (user_id), timestamp, and event type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new chat session can be created and its first message stored in under 500ms under normal load.
- **SC-002**: A paginated message history of 50 items loads in under 300ms for sessions with up to 10,000 messages.
- **SC-003**: Sessions from one user are never visible or accessible to another user — verified by automated access-control tests.
- **SC-004**: 100% of messages sent in a session are retrievable in order via the pagination API (no messages dropped or duplicated).
- **SC-005**: Session list for a user with 100 sessions returns in under 500ms.

## Assumptions

- A "Bot" entity (bot_id) already exists or will exist in the database as part of F2 (Bot Management). F3 stores bot_id as a foreign key reference but does not implement bot creation/management.
- Message streaming and actual LLM calls are handled by F4. F3 only persists the final text content of assistant messages after F4 delivers them.
- The user's identity (user_id) is derived from the authenticated JWT; the client does not pass user_id in the request body.
- Soft-delete is out of scope for v1; deletion is permanent.
- Full-text search across messages is out of scope for v1.
- Each message's content is plain text for v1; rich content (files, images) is out of scope.
- Page size is configurable per request with a server-enforced maximum of 200 messages per page.
