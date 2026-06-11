# Feature Specification: Agent Selection with Business Central Tools

**Feature Branch**: `001-agents-bc-tools`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Transform the home page bot selection into an agent selection system where each agent has its own context and tools. First agent: Promo/Discount Proposition Agent with Business Central database access."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select an Agent from the Home Page (Priority: P1)

A user opens the app and is presented with a list of agents — each described by its business purpose, not by its underlying AI model. The user picks the "Promo/Discount Proposition" agent and is taken into a conversation scoped to that agent.

**Why this priority**: This is the entry point of every session. Without agent selection, nothing else works. It replaces the current "choose a bot/model" flow with a meaningful "choose a business capability" flow.

**Independent Test**: Open the home page, confirm agent cards show purpose-oriented names and descriptions (no model/provider jargon), click an agent, confirm a chat session opens for that agent.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they land on the home page, **Then** they see a list of available agents with name, icon, and business-purpose description (no provider or model name shown).
2. **Given** the agent list is loading, **When** a delay occurs, **Then** skeleton placeholder cards are shown.
3. **Given** the user clicks an agent card, **When** the navigation completes, **Then** a new chat session is created scoped to that agent and the user lands in the chat view.

---

### User Story 2 - Chat with the Promo/Discount Proposition Agent (Priority: P1)

A user is in a chat session with the Promo/Discount Proposition Agent. They ask a question about a product's pricing or which customers qualify for a discount. The agent transparently queries the Business Central database to retrieve relevant data, then responds with a grounded, data-backed proposition.

**Why this priority**: This is the core value of the first agent. Without tool execution, the agent is just a generic chatbot.

**Independent Test**: Ask the agent "What products have a margin above 30%?" — the system should query BC, return rows, and the agent should include real product names and margins in its answer.

**Acceptance Scenarios**:

1. **Given** the user asks a question requiring product/pricing data, **When** the agent decides to query BC, **Then** the agent executes the `get_bc_tables` or `select_bc_table` tool, the result is incorporated into the response, and the user sees a coherent, data-grounded answer.
2. **Given** the agent issues a `select_bc_table` call with a filter (e.g., `Item` table, filter `Unit Price > 100`), **When** BC returns rows, **Then** the agent receives the JSON result and uses it to compose its recommendation.
3. **Given** the BC database is unreachable, **When** the agent tries to call a tool, **Then** the agent informs the user it cannot access the data source at this time and offers a general response.

---

### User Story 3 - Agent Executes `get_bc_tables` Tool (Priority: P2)

The agent can list all tables available in the Business Central database so it can choose the right table before running a query.

**Why this priority**: Required for the agent to self-navigate an unknown BC schema rather than relying on hardcoded table names.

**Independent Test**: Ask the agent "What data is available in Business Central?" — the agent should call `get_bc_tables` and enumerate the tables in its reply.

**Acceptance Scenarios**:

1. **Given** the agent calls `get_bc_tables`, **When** the tool executes, **Then** a JSON array of table names is returned and the agent can reference them.
2. **Given** the BC connection string is misconfigured, **When** the tool is called, **Then** an error message is returned to the agent (not surfaced as a crash), and the agent responds gracefully.

---

### User Story 4 - Agent Executes `select_bc_table` Tool (Priority: P2)

The agent can query a specific BC table with optional column selection and WHERE-style filters.

**Why this priority**: This is the primary data-access primitive for the Promo/Discount agent.

**Independent Test**: Invoke `select_bc_table` with `table_name="Item"`, `filters={"Unit Price >": 50}` — tool returns matching rows as JSON.

**Acceptance Scenarios**:

1. **Given** the agent calls `select_bc_table` with a valid table name and no filters, **When** the tool executes, **Then** all rows (up to a safe limit) from that table are returned as a JSON array.
2. **Given** the agent calls `select_bc_table` with `columns=["No_", "Description", "Unit Price"]` and `filters={"Blocked": false}`, **When** the tool executes, **Then** only the specified columns and matching rows are returned.
3. **Given** the table name does not exist, **When** the tool is called, **Then** an error message is returned to the agent describing the invalid table.

---

### Edge Cases

- What happens when the BC database has hundreds of tables — does `get_bc_tables` paginate or return all at once?
- How does the system handle a BC query that returns thousands of rows — is there a row limit to prevent token overflow?
- What if the agent calls `select_bc_table` on a sensitive BC table (e.g., payroll or user credentials)?
- What if two concurrent users are both using the Promo agent and both issue BC queries simultaneously?
- What if the LLM produces a malformed tool call (wrong parameter types or missing required fields)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display available agents as cards with name, purpose description, and a visual icon — no provider or model information shown to end users.
- **FR-002**: Each agent MUST be independently configurable with its own system prompt, tool set, and optional external data source connection.
- **FR-003**: The system MUST support an `agent_type` designation on each agent that determines which tools are made available during a session.
- **FR-004**: The Promo/Discount Proposition Agent MUST have access to a `get_bc_tables` tool that returns the list of available tables in the configured Business Central database.
- **FR-005**: The Promo/Discount Proposition Agent MUST have access to a `select_bc_table` tool accepting: `table_name` (required), `columns` (optional list), and `filters` (optional key-value conditions); returning matching rows as JSON.
- **FR-006**: The `select_bc_table` tool MUST enforce a maximum row return limit (default: 200 rows) to prevent token budget overflow.
- **FR-007**: The Business Central connection MUST be configurable via environment variable (separate from the application's own database) so credentials are never stored in code or the agent record.
- **FR-008**: When a tool call fails (BC unreachable, invalid table, query error), the agent MUST receive a structured error result and MUST NOT expose raw database error messages to the end user.
- **FR-009**: The chat service MUST support an agentic loop: stream tokens → detect tool call → execute tool → feed result back to LLM → continue streaming until a final text response is produced.
- **FR-010**: Agents without tools MUST continue to work exactly as today (no regression for basic chat agents).
- **FR-011**: The `select_bc_table` filters MUST support basic comparison operators: equality, greater-than, less-than, and "contains" (LIKE) on string fields.

### Key Entities

- **Agent**: A named, purpose-oriented AI assistant with its own system prompt, tool configuration, and optional external data source. Replaces the "bot" concept in the UI (backend model may remain `bots` table with new `agent_type` field).
- **AgentTool**: A callable function available to a specific agent type. Each tool has a name, description, input schema, and execution handler.
- **BCConnection**: Configuration for connecting to a Business Central SQL Server instance (connection string sourced from environment). Not stored in the agent record.
- **ToolCall**: A request from the LLM to invoke a named tool with structured arguments during a streaming session.
- **ToolResult**: The structured JSON output (or error) returned by a tool execution, fed back to the LLM to continue generation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate from the home page to an active agent chat session in under 5 seconds on a standard connection.
- **SC-002**: The agent correctly incorporates BC query results into at least 90% of responses where product/pricing data was requested (measured by manual test cases).
- **SC-003**: `select_bc_table` returns results in under 3 seconds for queries returning up to 200 rows on the production BC instance.
- **SC-004**: Existing chat agents (without tools) produce identical behavior after this change — zero regression in basic chat functionality.
- **SC-005**: When BC is unreachable, the agent provides a meaningful fallback response within the normal streaming timeout — no unhandled server errors visible to the user.
- **SC-006**: Tool call round-trips (LLM detects need → tool executes → result returned → LLM continues) complete within 10 seconds end-to-end for a single tool call.

## Assumptions

- The Business Central database is accessible via a direct SQL Server connection using ODBC from the backend server (same driver already used for the app database).
- The BC connection string will be stored as an environment variable (`BC_DATABASE_URL` or similar) — not in the database — since it contains credentials.
- Row-level security and table-level access control within BC are out of scope for v1; the backend connects with a read-only BC service account that already has appropriate permissions.
- Only one BC instance is needed for v1 (no per-tenant or per-agent BC connection configuration).
- The LLM provider for the Promo agent supports native function/tool calling (Anthropic Claude supports this; this is the assumed default provider for this agent).
- Existing sessions and chat history are unaffected; the `agent_type` field addition is additive and does not break existing bot records.
- The frontend does not need to display tool execution steps in the same visual detail as the existing `AgentProcess` reasoning panel for v1 — a simple "looking up data…" indicator is acceptable.
- Mobile / responsive layout is in scope to the same degree as the existing home page (cards already use a responsive grid).
