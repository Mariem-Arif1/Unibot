# Feature Specification: Admin Tool Builder

**Feature Branch**: `006-admin-tool-builder`

**Created**: 2026-06-11

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a BC Query Tool (Priority: P1)

An admin wants to expose a new Business Central data query to a bot without writing code. They open the Tools section of the admin panel, click "New Tool", fill in a name, a description explaining to the AI when to use it, write a SQL query with named placeholders for user-provided values (e.g. `{{item_no}}`), and define the parameters the AI can pass (name, data type, description, whether required). On save the tool is available to be assigned to bots.

**Why this priority**: This is the core value of the feature — eliminating the need to write Python to add a new data capability. Without it the rest of the feature has no purpose.

**Independent Test**: Can be tested in isolation by creating a tool and verifying it appears in the tool list with the correct name, description, SQL, and parameters. No bot assignment or chat needed.

**Acceptance Scenarios**:

1. **Given** the admin is on the Tools list page, **When** they click "New Tool" and submit a valid name, description, SQL query with at least one `{{param}}` placeholder, and a matching parameter definition, **Then** the tool is saved and appears in the list as Active.
2. **Given** a tool exists, **When** the admin opens it for editing and changes the description or SQL, **Then** the updated values are reflected immediately in the list.
3. **Given** a tool exists and is Active, **When** the admin deactivates it, **Then** it no longer appears as an available tool during bot assignment.
4. **Given** a tool is submitted with a SQL template referencing `{{item_no}}` but no parameter named `item_no` is defined, **Then** the system warns the admin of the mismatch before saving.

---

### User Story 2 — Assign Tools to a Bot (Priority: P1)

An admin opens an existing bot's edit page and sees a "Tools" section listing all active tools with checkboxes. They check the tools they want the bot to use and save. From that point on, when a user chats with that bot, the AI can call any of the assigned tools to query Business Central data.

**Why this priority**: Tool creation alone delivers no value until tools are wired to bots. This completes the loop from tool definition to live usage.

**Independent Test**: Can be tested by assigning a tool to a bot, then verifying the assignment is persisted (visible next time the bot edit page is opened). Full end-to-end chat test is optional at this stage.

**Acceptance Scenarios**:

1. **Given** a bot edit page with a Tools section, **When** the admin checks two tools and saves, **Then** those tools appear as checked when the page is reopened.
2. **Given** a bot has three tools assigned, **When** the admin unchecks one and saves, **Then** only two tools remain assigned.
3. **Given** a tool is deactivated, **When** an admin views the bot edit page, **Then** the deactivated tool is hidden from the selection list.

---

### User Story 3 — Tools Execute During Chat (Priority: P1)

When a user sends a message to a bot that has tools assigned, the AI decides which tool(s) to call, the platform executes the corresponding SQL query against the organisation's Business Central database using any provided parameters, and returns the results to the AI to formulate its answer. The user never sees raw SQL — they see the AI's natural-language interpretation of the results.

**Why this priority**: Without runtime execution the feature has no business value — the admin configuration only matters if it drives live behaviour.

**Independent Test**: Can be tested by chatting with a bot that has at least one tool assigned and asking a question that should trigger a BC query. Verify the AI's response reflects actual BC data, and that no SQL or raw JSON is exposed to the user.

**Acceptance Scenarios**:

1. **Given** a bot has a "search items" tool assigned, **When** the user asks "what products do we have in category X?", **Then** the AI calls the tool, receives item rows from BC, and answers in natural language.
2. **Given** a tool's SQL template contains `{{item_no}}` and the AI provides `item_no = "CHAIR-001"`, **Then** the query executes with the value safely bound (not interpolated into the SQL string).
3. **Given** a tool query returns zero rows, **Then** the AI acknowledges that no matching data was found rather than fabricating an answer.
4. **Given** the BC database is unreachable, **Then** the AI receives an error result and tells the user the data source is temporarily unavailable.

---

### User Story 4 — Migrate Existing Hardcoded Tools (Priority: P2)

The five existing promo/discount tools (search_items, search_customers, search_sales_prices, search_line_discounts, search_campaigns) and the two generic BC tools (get_bc_tables, select_bc_table) currently hardcoded in the platform are seeded into the database as managed tools. Bots previously using the `promo_discount` agent_type automatically have these tools assigned. No disruption to existing chat behaviour.

**Why this priority**: Ensures the transition from hardcoded to DB-driven tools does not break any live bot. Lower priority than the new builder because existing bots continue to work during migration.

**Independent Test**: Can be tested by verifying the seven seeded tools appear in the admin Tools list and that any bot previously of type `promo_discount` has them assigned. Chat with such a bot to confirm BC queries still work.

**Acceptance Scenarios**:

1. **Given** the migration has run, **When** an admin opens the Tools list, **Then** all seven legacy tools appear with their original names and descriptions.
2. **Given** a bot was previously `agent_type = promo_discount`, **When** the migration runs, **Then** that bot has all seven tools assigned and chat behaviour is unchanged.

---

### Edge Cases

- What happens when a SQL template placeholder `{{param}}` appears in the query but no matching parameter is defined? → Warn the admin on save; block execution at runtime if a required placeholder has no value.
- What happens if an admin deletes a tool that is assigned to one or more bots? → The tool is removed from all bot assignments; bots simply lose that capability.
- What happens if the SQL query contains a semicolon or attempts multiple statements? → The platform executes only the first statement; subsequent statements are ignored or rejected.
- What happens if a parameter value provided by the AI is of the wrong type (e.g. a string where a number is expected)? → The platform coerces or rejects the value and returns an error to the AI.
- What if a bot has no tools assigned? → The bot operates as a plain LLM with no BC access (current default behaviour).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admins MUST be able to create a tool with a name, a plain-language description, a SQL query template, and a list of input parameters (each with name, data type, description, and required flag).
- **FR-002**: SQL templates MUST support named placeholders in the format `{{parameter_name}}` which are substituted with parameterised values at runtime — never by string interpolation.
- **FR-003**: The platform MUST warn admins when a placeholder referenced in the SQL template has no corresponding parameter definition (and vice versa).
- **FR-004**: Admins MUST be able to edit any field of an existing tool.
- **FR-005**: Admins MUST be able to deactivate a tool without deleting it; deactivated tools are excluded from bot assignment and chat execution.
- **FR-006**: Admins MUST be able to permanently delete a tool; deletion automatically removes all bot assignments for that tool.
- **FR-007**: Admins MUST be able to assign any number of active tools to a bot from the bot's edit page.
- **FR-008**: The platform MUST load a bot's assigned tools at chat time and make their schemas available to the AI model.
- **FR-009**: At chat time, when the AI invokes a tool, the platform MUST execute the SQL template against the user's organisation's Business Central connection, bind the AI-provided parameter values safely, and return the result rows as structured data to the AI.
- **FR-010**: Existing hardcoded tools MUST be seeded into the database and assigned to bots that previously relied on the `promo_discount` agent_type, with no change in chat behaviour.
- **FR-011**: Only users with the administrator role MUST be able to create, edit, assign, or delete tools.

### Key Entities

- **Tool**: A named, reusable BC query capability. Has a name, description (for the AI), a SQL template with placeholders, a parameter list (stored as structured data), an active/inactive status, and a creation timestamp.
- **Parameter**: Part of a Tool definition. Has a name (matching a `{{placeholder}}`), a data type (string, number, boolean), a description the AI can read, and a required flag.
- **Bot–Tool Assignment**: A relationship linking a Bot (business persona) to zero or more Tools. Determines which BC capabilities are available during a chat session with that bot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can define a new BC query tool and assign it to a bot in under 5 minutes, with no code changes or server restarts required.
- **SC-002**: 100% of chat sessions with a tool-enabled bot correctly execute the tool's SQL and return results to the AI — no silent failures.
- **SC-003**: All seven legacy hardcoded tools are available in the admin UI after migration, with existing bot behaviour fully preserved.
- **SC-004**: Parameter values provided by the AI are never interpolated directly into SQL — verified by attempting a SQL-injection-style value and confirming it is treated as a literal.
- **SC-005**: Admins can manage the full tool lifecycle (create → assign → deactivate → delete) without leaving the admin panel.

## Assumptions

- Only Business Central SQL queries are supported in v1; support for external REST APIs or other data sources is out of scope.
- The SQL template must be a single SELECT statement; DML (INSERT, UPDATE, DELETE) is out of scope and will be blocked.
- The AI model is responsible for deciding when to call a tool and which parameter values to pass; the platform is responsible only for safe execution and result delivery.
- Parameter data types are limited to string, number, and boolean in v1; complex types (arrays, objects) are out of scope.
- Tool names must be unique across the platform (not just per bot), as they form the function name the AI uses to call the tool.
- The existing `agent_type` field on bots is retained for backwards compatibility but has no effect once tools are DB-driven; it can be deprecated in a future cleanup.
- Each organisation's BC connection string is already configured on the Organisation record; the tool executor uses it automatically.
