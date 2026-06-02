# Research: LLM Provider Adapter

**Feature**: F4 — LLM Provider Adapter
**Date**: 2026-06-01

---

## Decision 1: Streaming Protocol — SSE vs WebSocket

**Decision**: Server-Sent Events (SSE) via FastAPI `StreamingResponse` with `text/event-stream` content type.

**Rationale**: SSE is unidirectional (server → client), which matches the LLM streaming pattern exactly. It works natively over HTTP/1.1 and HTTP/2, requires no special server infrastructure, and is supported by all modern browsers with the `EventSource` API. WebSocket adds bidirectional complexity without benefit for this use case.

**Alternatives considered**:
- WebSocket: Overkill for one-directional token streaming; complicates load balancers and proxies.
- Long-polling: Higher latency, worse UX for token streaming.

---

## Decision 2: Anthropic Python SDK vs Raw HTTP

**Decision**: Use the official `anthropic` Python SDK with `stream=True`. Pin to `anthropic>=0.25.0`.

**Rationale**: The official SDK handles authentication, retries, streaming event parsing, and error normalization. Avoids re-implementing the streaming protocol. The SDK's `MessageStreamManager` provides a clean async context manager for streaming.

**Alternatives considered**:
- Raw `httpx` with manual SSE parsing: More control but high maintenance burden, especially as the Anthropic API evolves.

---

## Decision 3: OpenAI Python SDK

**Decision**: Use the official `openai` Python SDK (`openai>=1.30.0`) with `stream=True`.

**Rationale**: Consistent with the Anthropic decision. The OpenAI SDK handles streaming, retries, and chat completion formatting. Both SDKs use async-compatible clients.

**Alternatives considered**:
- Azure OpenAI SDK: Not needed for v1 (using direct OpenAI API). Can be added later.

---

## Decision 4: Adapter Interface Design

**Decision**: Define an abstract `LLMProvider` protocol with a single `async def stream(messages, config) -> AsyncIterator[str]` method. Each provider (Anthropic, OpenAI) implements this protocol.

**Rationale**: Satisfies the constitution requirement that adding a provider must not require changes outside the adapter module. The protocol is duck-typed (Python `typing.Protocol`) so no inheritance hierarchy is needed. A `ProviderFactory.get(provider_name)` function resolves the concrete implementation from configuration.

**Alternatives considered**:
- Single class with if/else branching per provider: Violates open/closed principle; every new provider requires editing the core dispatch class.
- Plugin registry with entry points: Over-engineered for v1 with two providers.

---

## Decision 5: Context Window Truncation Strategy

**Decision**: Truncate oldest non-system messages until the estimated token count fits within `bot.context_window_tokens`. Use a simple character-based approximation (1 token ≈ 4 characters) for v1. The system prompt is never truncated.

**Rationale**: Exact tokenizers (tiktoken for OpenAI, Anthropic's token counting API) add latency and dependency complexity. A character-based estimate is conservative (over-estimates tokens) and safe for v1. Per-model exact tokenizers can be added in v2.

**Alternatives considered**:
- `tiktoken` for exact OpenAI counts: Adds a dependency and per-model lookup; overkill for v1.
- Anthropic token counting API (beta): Adds an extra API call per message, increasing latency.

---

## Decision 6: Persisting the Assembled Response

**Decision**: The streaming endpoint accumulates all chunks into a buffer. When the stream completes (or on error), it calls `MessageService.add_message(session_id, role="assistant", content=assembled_text)` directly (internal service call, not an HTTP hop).

**Rationale**: The F3 `MessageService` is a Python class importable by the F4 streaming service. Calling it directly avoids an internal HTTP round-trip. If streaming errors mid-response, the partial buffer is discarded — no partial message is persisted.

**Alternatives considered**:
- Separate background task to persist after streaming: Introduces a race condition where the client might request history before persistence completes.
- HTTP call to POST /sessions/{id}/messages: Unnecessary network hop for internal code.

---

## Decision 7: Concurrent LLM Call Guard

**Decision**: Use an in-memory `asyncio.Lock` keyed by session_id (stored in a module-level dict) to prevent concurrent LLM calls for the same session. Return HTTP 409 Conflict if the lock is held.

**Rationale**: At v1 scale (~200 users), in-process locking is sufficient. Redis-based distributed locking is not needed until horizontal scaling is required.

**Alternatives considered**:
- DB-level advisory lock: Complex with SQL Server; out of character for the async stack.
- Redis SETNX: Adds operational dependency for a small-scale guard.

---

## Decision 8: API Key Storage

**Decision**: Provider API keys loaded from environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) via `pydantic-settings`. Never stored in DB or logged.

**Rationale**: Consistent with F1's secret management pattern (JWT key from env). Pydantic-settings loads `.env` in dev and real env vars in production. The constitution forbids API keys in source code or bot configuration plain-text.

---

## Decision 9: Bot LLM Configuration Storage

**Decision**: Bot entity (F2) will store: `provider` (VARCHAR(20)), `model` (VARCHAR(100)), `system_prompt` (NVARCHAR(MAX)), `temperature` (FLOAT), `max_tokens` (INT), `context_window_tokens` (INT). F4 reads this configuration from the DB via the Bot model.

**Rationale**: Configuration in the DB allows admins to change bot behaviour without redeployment. The F4 adapter reads bot config at request time; no per-request caching in v1 (fine at small scale).

---

## Decision 10: Error Handling — Partial Stream Failures

**Decision**: If the LLM provider raises an error after tokens have already been sent to the client, emit a special SSE error event (`event: error\ndata: {"message": "..."}\n\n`) and close the stream. No partial message is persisted.

**Rationale**: Once SSE headers are sent (HTTP 200), we can no longer change the status code. The error event pattern is the standard SSE way to communicate server-side errors after streaming starts.
