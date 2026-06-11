# Feature Specification: Admin Agent Management

**Feature Branch**: `005-admin-agent-management`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Admin-only section where users with role="admin" can create, edit, deactivate, and delete AI agents (bots), including full configuration (name, description, provider, model, system prompt, temperature, max_tokens, agent_type, is_active).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View All Agents (Priority: P1)

An admin opens the agent management dashboard and sees a complete list of all agents on the platform — both active and inactive — with enough information to understand each agent's purpose and status at a glance.

**Why this priority**: Without a list view, no other management action is possible. It is the entry point for the entire feature and the minimum viable deliverable.

**Independent Test**: Log in as an admin user and navigate to `/admin/agents`. Confirm a table is visible showing all agents (including inactive ones). Confirm a non-admin user navigating to `/admin/agents` is redirected to `/bots`.

**Acceptance Scenarios**:

1. **Given** a logged-in admin, **When** they navigate to `/admin/agents`, **Then** they see a table listing all agents with columns: name, provider, model, agent category badge, and active status.
2. **Given** a logged-in non-admin user, **When** they navigate to `/admin/agents`, **Then** they are immediately redirected to `/bots` without seeing any admin content.
3. **Given** no agents exist, **When** an admin views the list, **Then** an empty-state message is shown with a prominent "Create Agent" button.

---

### User Story 2 — Create a New Agent (Priority: P1)

An admin fills out a creation form with all required agent fields and submits it to add a new agent to the platform. The agent becomes immediately available (if active) to users.

**Why this priority**: Creating agents is the core admin action. Without it, the platform cannot be populated with new agents without direct database access.

**Independent Test**: As an admin, click "Create Agent", fill out the form with valid values, submit. Confirm the new agent appears in the agent list and (if active) in the regular `/bots` page for end users.

**Acceptance Scenarios**:

1. **Given** an admin on the create form, **When** they submit valid data (name, provider, model, system prompt), **Then** the agent is created and the admin is redirected to the agent list showing the new entry.
2. **Given** an admin on the create form, **When** they submit with missing required fields (name, provider, or model), **Then** inline validation errors are shown and the form is not submitted.
3. **Given** an admin setting agent type to "Promo & Discounts", **When** they save, **Then** the agent is stored with the Business Central tool configuration enabled.
4. **Given** an admin creating an agent with active status set to off, **When** saved, **Then** the agent does not appear on the regular `/bots` page for end users.

---

### User Story 3 — Edit an Existing Agent (Priority: P2)

An admin selects an existing agent, updates one or more fields (e.g., changes the system prompt, adjusts temperature, switches model), and saves the changes. Changes take effect for the next user conversation.

**Why this priority**: Agents need tuning over time. Editing is essential for keeping the platform current without direct database access.

**Independent Test**: Open an existing agent's edit form, change the system prompt, save. Confirm the updated value is visible in the list and in the edit form if reopened.

**Acceptance Scenarios**:

1. **Given** an admin on the edit form for an existing agent, **When** they change the system prompt and save, **Then** the agent's system prompt is updated and a success notification is shown.
2. **Given** an admin on the edit form, **When** they clear a required field and submit, **Then** validation prevents saving and shows an inline error.
3. **Given** an admin editing an agent, **When** they toggle active status to off and save, **Then** the agent disappears from the end-user bot list immediately.

---

### User Story 4 — Deactivate or Delete an Agent (Priority: P3)

An admin can deactivate an agent (soft-disable — hides from users but preserves all data and history) or permanently delete it. Both destructive actions are protected by a confirmation dialog.

**Why this priority**: Lifecycle management is important but lower priority — agents can remain inactive without immediate harm.

**Independent Test**: Deactivate an active agent from the list. Confirm it no longer appears on `/bots`. Re-activate it. Confirm it reappears. Delete an agent and confirm it is removed from both the admin list and the user list.

**Acceptance Scenarios**:

1. **Given** an active agent in the list, **When** an admin clicks "Deactivate" and confirms, **Then** the agent becomes inactive and is no longer visible to end users.
2. **Given** an inactive agent, **When** an admin clicks "Activate", **Then** the agent becomes active and reappears for end users.
3. **Given** an agent in the list, **When** an admin clicks "Delete" and confirms the dialog, **Then** the agent is permanently removed from both the admin list and the user-facing bot list.
4. **Given** any destructive action (deactivate or delete), **When** the admin clicks the action button, **Then** a confirmation dialog is shown before the action executes.

---

### Edge Cases

- What happens when a non-admin user directly navigates to `/admin/agents/new`? → They are redirected to `/bots`; no form is shown.
- What happens if the backend is unreachable when saving a form? → An error message is displayed and the form data is preserved so the admin does not lose their work.
- What happens when two admin users edit the same agent simultaneously? → Last write wins; no special conflict detection is required for v1.
- What happens if temperature is submitted outside the 0–1 range? → Form validation prevents submission and displays a clear boundary error.
- What happens when an admin deletes an agent that has existing chat sessions? → The agent is deleted; session message history is retained but no new messages can be sent to that agent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST restrict access to all admin management routes to users with the admin role; all other users MUST be redirected to the standard bot list.
- **FR-002**: The admin agent list MUST display all agents regardless of active status, with a clear visual indicator distinguishing active from inactive agents.
- **FR-003**: Admins MUST be able to create a new agent by providing: name (required), description (optional), provider (required: Anthropic or OpenAI), model identifier (required), system prompt (required), temperature (0.0–1.0), maximum response tokens, context window size, agent type (optional), and active status.
- **FR-004**: Admins MUST be able to edit any field of an existing agent and save changes without recreating the agent or losing its chat history.
- **FR-005**: Admins MUST be able to deactivate an agent without deleting it; deactivation immediately removes the agent from the end-user bot list while preserving all associated data.
- **FR-006**: Admins MUST be able to permanently delete an agent; deletion MUST require explicit confirmation via a dialog.
- **FR-007**: All create and edit operations MUST validate required fields before submission; validation errors MUST be shown inline next to the relevant field.
- **FR-008**: The admin section MUST be accessible via a navigation link visible only to admin users.
- **FR-009**: Agent type selection MUST offer at minimum: no type (generic assistant) and "Promo & Discounts" (Business Central–connected agent).
- **FR-010**: Activating or deactivating an agent MUST be reflected on the end-user bot list without requiring the end user to reload the page.

### Key Entities

- **Agent (Bot)**: The core managed entity. Attributes: name, description, provider, model, system prompt, temperature, maximum response tokens, context window size, agent type, active status, and creation timestamp.
- **Admin User**: A platform user with the admin role. Can perform all create, read, update, and delete operations on agents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a fully configured agent (all fields filled) in under 3 minutes from opening the form to seeing it confirmed in the agent list.
- **SC-002**: 100% of unauthorized access attempts to admin routes by non-admin users result in a redirect — no admin data is exposed.
- **SC-003**: Agent status changes (activate/deactivate) are reflected in the end-user bot list within 5 seconds of the admin saving, without a manual page refresh by the end user.
- **SC-004**: All form validation errors are displayed inline next to the relevant field — admins never need to scroll to locate what went wrong.
- **SC-005**: The admin agent list loads all agents (up to 100) in under 2 seconds under normal network conditions.

## Assumptions

- Admin users already exist in the system via direct database seed or a future user-management feature; this spec does not cover admin user creation.
- The user role system already recognizes the "admin" role value — no schema changes are needed.
- All required agent fields (agent type, active status, system prompt, temperature, token limits) already exist in the data model — no database migrations are needed.
- Agent-to-user assignment (controlling which users see which agents) is out of scope; the existing behavior where all active agents are visible to all authenticated users is unchanged.
- Desktop-first layout is acceptable for v1; mobile responsiveness for the admin panel is a nice-to-have, not a requirement.
- No pagination is required for the agent list in v1 (fewer than 100 agents assumed).
- The "Promo & Discounts" agent type is the only non-generic type for v1; the implementation must allow new types to be added via configuration without requiring a code change to the form.
