# Research: Admin Agent Management

**Feature**: 005-admin-agent-management
**Date**: 2026-06-11

## Decision Log

### D1 — Admin authorization strategy

**Decision**: Reuse the existing `require_role(UserRole.admin)` dependency from `dependencies.py`.

**Rationale**: The function already exists and follows the FastAPI dependency injection pattern used across the codebase. Creating a second mechanism would be redundant and inconsistent.

**Alternatives considered**:
- New `require_admin` function — rejected; duplicates existing `require_role`
- Middleware-only check — rejected; backend must enforce at API level per Constitution Principle I

---

### D2 — Admin router placement

**Decision**: New file `backend/src/api/v1/admin_bots.py`, registered at `/api/v1/admin/bots`.

**Rationale**: Keeps admin CRUD strictly separated from the user-facing `GET /api/v1/bots` endpoints. Prevents any route confusion or accidental capability exposure.

**Alternatives considered**:
- Extend existing `bots.py` with role-guarded routes — rejected; mixes concerns and makes the security boundary less obvious at a glance

---

### D3 — Frontend role enforcement

**Decision**: Two-layer guard — Next.js middleware (Edge Runtime) + admin layout client check.

**Rationale**: Middleware provides server-side interception before the page is served. The layout client check is a belt-and-suspenders guard in case cookies change mid-session. Both layers decode the same `aivora_access` JWT cookie using `jwt-decode` (already a dependency).

**Alternatives considered**:
- Layout-only client check — rejected; non-admins would momentarily see the page before redirect
- Server Component with `cookies()` API — considered; excluded because the project uses `"use client"` layouts throughout

---

### D4 — Sensitive field exposure

**Decision**: New `BotAdmin` interface in the frontend that includes all bot fields (`system_prompt`, `temperature`, etc.). Existing `Bot` interface is unchanged and continues to omit these fields.

**Rationale**: The existing `Bot` type was intentionally minimal (spec 004-web-chat-ui T032: sensitive fields must not appear in network responses to regular users). Admin responses go to a separate endpoint (`/api/v1/admin/bots`) that requires the admin role — safe to expose full field set.

**Alternatives considered**:
- Extend `Bot` with optional fields — rejected; risks accidentally rendering sensitive fields in non-admin components

---

### D5 — Delete vs deactivate

**Decision**: DELETE endpoint performs a hard delete. Deactivation is `PUT` with `{ is_active: false }`.

**Rationale**: Aligns with the spec requirement that deletion is permanent and requires confirmation, while deactivation is reversible. Separation avoids ambiguous "soft delete" patterns.

**Alternatives considered**:
- Soft-delete only (no hard delete) — rejected; spec explicitly requires permanent delete capability

---

### D6 — Form architecture

**Decision**: Single `AgentForm` component shared by create and edit pages, differentiated by `initialValues` prop.

**Rationale**: The field set is identical for both operations. A single component eliminates duplication and ensures create/edit stay in sync as fields evolve.

**Alternatives considered**:
- Separate `CreateAgentForm` and `EditAgentForm` — rejected; duplicates ~95% of JSX with no benefit

---

### D7 — Agent type options

**Decision**: `AGENT_TYPE_OPTIONS` constant array in `AgentForm.tsx`. V1 values: `{ value: "", label: "Generic Assistant" }` and `{ value: "promo_discount", label: "Promo & Discounts" }`.

**Rationale**: Centralizes the option list so adding a new agent type requires only adding one entry to the constant — no structural form changes.

**Alternatives considered**:
- Fetch options from backend — rejected; over-engineering for v1; options are few and stable
