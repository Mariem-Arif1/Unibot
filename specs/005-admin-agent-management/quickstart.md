# Quickstart: Admin Agent Management

**Feature**: 005-admin-agent-management

## Prerequisites

- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`
- At least one user with `role = "admin"` in the `users` table

## Make a User Admin (one-time setup)

Connect to the SQL Server database and run:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Golden Path — Create an Agent

1. Log in at `http://localhost:3000/login` with an admin account.
2. Click **Admin** in the navigation header (visible only to admins).
3. You are redirected to `/admin/agents` — the agent list table.
4. Click **Create Agent**.
5. Fill in the form:
   - **Name**: `Test Agent`
   - **Provider**: `Anthropic`
   - **Model**: `claude-sonnet-4-6`
   - **System Prompt**: `You are a helpful assistant.`
   - Leave other fields at defaults.
6. Click **Save**. You are redirected to the agent list showing the new entry.
7. Navigate to `/bots` — the new agent appears in the user-facing bot grid (if `is_active = true`).

## Golden Path — Edit an Agent

1. From `/admin/agents`, click **Edit** on any row.
2. The edit form opens pre-filled with the agent's current values.
3. Change the **System Prompt** and click **Save**.
4. Confirm the updated value is visible if you open the edit form again.

## Golden Path — Deactivate an Agent

1. From `/admin/agents`, click **Deactivate** on an active agent and confirm the dialog.
2. The agent's status changes to **Inactive** in the table.
3. Navigate to `/bots` — the deactivated agent is no longer listed.
4. Return to `/admin/agents`, click **Activate** — the agent reappears on `/bots`.

## Golden Path — Delete an Agent

1. From `/admin/agents`, click **Delete** on any agent.
2. A confirmation dialog shows the agent name and a warning.
3. Click **Delete** to confirm. The agent is permanently removed from the list.

## Access Control Tests

| Scenario | Expected |
|----------|----------|
| Non-admin navigates to `/admin/agents` | Redirected to `/bots` |
| Non-admin calls `GET /api/v1/admin/bots` directly | `403 Forbidden` |
| Admin link in header | Visible only when logged in as admin |

## Verify Sensitive Field Isolation

Open browser DevTools → Network tab. Navigate to `/bots` as a regular user and inspect the `GET /api/v1/bots` response — confirm `system_prompt`, `temperature`, `max_tokens`, and `context_window_tokens` are **not** present in the response body.

Repeat as admin using `GET /api/v1/admin/bots` — confirm all fields **are** present.
