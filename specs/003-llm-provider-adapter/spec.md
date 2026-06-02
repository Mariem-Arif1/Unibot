# Feature Specification: LLM Provider Adapter

**Feature Branch**: `003-llm-provider-adapter`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "F4 - LLM Provider Adapter — Claude, GPT, streaming"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send a Message and Receive a Streamed Response (Priority: P1)

A user types a message in an active chat session. The platform forwards the message along with the session's prior history (up to a configured context window) to the bot's configured LLM provider (Claude or GPT-4). The assistant's reply streams back token by token so the user sees words appearing in real time rather than waiting for the full response.

**Why this priority**: This is the core interaction loop — the platform has no value without the ability to actually call an LLM and deliver its response to the user.

**Independent Test**: Can be tested by sending a message to a test session backed by a real (or mocked) LLM provider, verifying that tokens are streamed over SSE/WebSocket, and that the complete assembled response is persisted to the session via F3 at the end.

**Acceptance Scenarios**:

1. **Given** a session with prior messages and a bot configured for Claude, **When** the user sends a message, **Then** the system begins streaming tokens within 2 seconds and the full response is delivered without interruption.
2. **Given** a session with a bot configured for GPT-4, **When** the user sends a message, **Then** the system calls the OpenAI API and streams back the response identically to Claude.
3. **Given** the LLM provider returns an error (e.g., rate limit), **When** this occurs mid-session, **Then** the user receives a clear error indicator and no partial message is persisted.
4. **Given** a streaming response completes, **When** the final token is delivered, **Then** the full assembled assistant message is persisted to the session (F3) with role "assistant".

---

### User Story 2 - Bot-Specific Context and System Prompt (Priority: P2)

Each bot has its own system prompt and configuration (temperature, max tokens, context window size). When a user sends a message, the adapter injects the bot's system prompt as the first message in the LLM call and respects the bot's configuration parameters.

**Why this priority**: Without per-bot configuration, all bots behave identically — there is no differentiation between a "Navision assistant" and a "general assistant".

**Independent Test**: Can be tested by configuring two bots with different system prompts, sending the same message to each, and verifying that the responses differ according to the system prompts.

**Acceptance Scenarios**:

1. **Given** a bot configured with system prompt "You are a Navision data expert", **When** a user sends a question, **Then** the LLM call includes that system prompt as the first message.
2. **Given** a bot configured with temperature 0.2 and max_tokens 512, **When** the adapter calls the LLM, **Then** those parameters are passed to the provider API.
3. **Given** a conversation with 200 messages exceeding the context window, **When** the adapter builds the LLM payload, **Then** only the most recent N messages fitting within the context window are included (oldest are truncated), with the system prompt always retained.

---

### User Story 3 - Multi-Provider Support and Switchability (Priority: P3)

An administrator can configure a bot to use any supported LLM provider (currently Claude by Anthropic and GPT models by OpenAI). The adapter abstracts provider differences so adding a new provider in the future requires minimal changes.

**Why this priority**: The platform's value proposition includes multi-LLM support. While Claude may be the first provider, the architecture must not hard-code it.

**Independent Test**: Can be tested by switching a bot's provider from Claude to GPT, sending a message, and confirming the correct provider's API was called.

**Acceptance Scenarios**:

1. **Given** a bot configured with provider "anthropic" and model "claude-3-5-sonnet", **When** a message is sent, **Then** only the Anthropic API is called.
2. **Given** a bot configured with provider "openai" and model "gpt-4o", **When** a message is sent, **Then** only the OpenAI API is called.
3. **Given** an unsupported provider configured on a bot, **When** a message is sent, **Then** the system returns a clear configuration error without crashing.

---

### Edge Cases

- What happens if the LLM provider is unreachable (network timeout)? → The stream is closed with an error event; no partial assistant message is persisted; the user sees a "provider unavailable" error.
- What happens if the user disconnects mid-stream? → The server continues receiving the full response and persists it, so the user can reload and see the complete message.
- What happens if the context window is exceeded even with truncation? → The oldest non-system messages are dropped until the payload fits. The system prompt is never truncated.
- What happens if the API key for a provider is missing or expired? → The request fails immediately with a configuration error before contacting the provider.
- What happens with concurrent messages in the same session? → Only one LLM call per session should be in-flight at a time; concurrent requests return a "session busy" error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support streaming LLM responses to clients using Server-Sent Events (SSE).
- **FR-002**: System MUST support at least two LLM providers: Anthropic (Claude models) and OpenAI (GPT models).
- **FR-003**: Each bot MUST have a configurable: provider, model name, system prompt, temperature, max_tokens, and context window size.
- **FR-004**: The adapter MUST inject the bot's system prompt as the leading message in every LLM API call.
- **FR-005**: The adapter MUST truncate conversation history (oldest messages first, preserving system prompt) to fit within the configured context window.
- **FR-006**: Upon successful stream completion, the adapter MUST persist the assembled assistant message to the session via the persistence layer (F3).
- **FR-007**: If the LLM provider returns an error or the stream fails, the system MUST NOT persist any partial message.
- **FR-008**: The system MUST prevent concurrent LLM calls for the same session (queue or reject the second request).
- **FR-009**: The adapter layer MUST be provider-agnostic — adding a new provider MUST NOT require changes outside the adapter module.
- **FR-010**: LLM provider API keys MUST NOT be exposed to clients at any time.

### Key Entities

- **Bot**: Extended from F2 to include LLM configuration: provider (anthropic/openai), model, system_prompt, temperature, max_tokens, context_window_tokens.
- **LLMProviderConfig**: Encapsulates per-provider credentials and endpoint settings (API key, base URL). Stored server-side, never exposed to clients.
- **StreamEvent**: A transient event representing a single token chunk delivered to the client during a streaming response. Not persisted.
- **ChatMessage** (from F3): The final assembled assistant response is persisted here once streaming completes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First token of an LLM response is delivered to the client within 3 seconds of the user sending a message under normal conditions.
- **SC-002**: Streamed responses of up to 2,000 tokens complete without dropped tokens or client disconnection errors.
- **SC-003**: Switching a bot's provider from one vendor to another requires only a configuration change — no code deployment.
- **SC-004**: 100% of successfully completed LLM responses are persisted to the session history, verified by comparing streamed content to stored content.
- **SC-005**: Provider API keys are never present in any client-facing response, log, or error message — verified by security review.

## Assumptions

- Bot entity and bot-to-user authorization are managed by F2 (Bot Management). F4 reads bot configuration but does not create or modify bots.
- Session and message persistence are handled by F3. F4 calls F3's internal API to store the completed assistant message.
- Navision tool integration (F5) is out of scope for F4. F4 handles text completion only; tool calling/function calling is a separate feature.
- Provider API keys are stored in server-side environment configuration; the admin interface for managing them is out of scope for v1.
- Context window management is based on token count estimation. Exact token counting per model is a best-effort approximation acceptable for v1.
- Only text modalities are supported in v1 (no image input, file attachments, or audio).
- The client connection protocol for streaming is Server-Sent Events (SSE); WebSocket upgrade is out of scope for v1.
