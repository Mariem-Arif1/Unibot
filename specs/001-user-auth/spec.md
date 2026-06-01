# Feature Specification: F1 — Authentication & User Management

**Feature Branch**: `001-user-auth`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Simple username/password login for the Aivora platform, with JWT-based
sessions, role-based access (admin / user), and a frontend auth flow. Azure AD upgrade path
deferred to a later feature."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registered User Logs In (Priority: P1)

A registered user opens the Aivora web app, enters their email address and password on the login
page, and is redirected to their personal bot list upon successful authentication.

**Why this priority**: Login is the gateway to every other feature. Without it, no other part of
the platform is accessible. All downstream stories depend on a valid authenticated session.

**Independent Test**: Open the login page in a browser. Enter valid credentials. Confirm the
browser is redirected to the bot list page and the session token is stored. The bot list page
is intentionally minimal at this stage — just a placeholder "You are logged in" view is
sufficient to validate this story independently.

**Acceptance Scenarios**:

1. **Given** a registered user with valid credentials,
   **When** they submit the login form,
   **Then** they are redirected to the bot list page and a session is established.

2. **Given** a registered user with an incorrect password,
   **When** they submit the login form,
   **Then** an error message "Invalid email or password" is shown and no session is created.

3. **Given** an email address that does not exist in the system,
   **When** they submit the login form,
   **Then** the same generic error "Invalid email or password" is shown (no user enumeration).

4. **Given** a registered user who submits the form with both fields empty,
   **When** the form is validated,
   **Then** inline validation errors are shown before the request is sent.

---

### User Story 2 — Authenticated User Accesses a Protected Page (Priority: P2)

An authenticated user navigates directly to a protected URL (e.g., `/bots`) and sees the page
normally. An unauthenticated user who navigates to the same URL is redirected to the login page.

**Why this priority**: Protected routing is the enforcement mechanism for access control. Without
it, any unauthenticated visitor could reach internal pages.

**Independent Test**: With a valid session token, navigate to a protected URL and confirm the
page loads. Then clear the token and navigate again — confirm a redirect to `/login` occurs.

**Acceptance Scenarios**:

1. **Given** a user with a valid, non-expired session token,
   **When** they navigate to any protected route,
   **Then** the page loads normally without re-prompting for credentials.

2. **Given** a user with no session token (not logged in),
   **When** they navigate to any protected route,
   **Then** they are immediately redirected to the login page.

3. **Given** a user whose session token has expired,
   **When** they attempt to access a protected route,
   **Then** they are redirected to the login page with a message "Your session has expired."

4. **Given** a valid refresh token,
   **When** the access token expires,
   **Then** the system transparently issues a new access token without requiring re-login.

---

### User Story 3 — User Logs Out (Priority: P3)

An authenticated user clicks "Log out". Their session is invalidated and they are redirected to
the login page. Any subsequent attempt to use the old session token is rejected.

**Why this priority**: Logout is required for security hygiene and shared-device scenarios. It
completes the session lifecycle.

**Independent Test**: Log in, then log out. Confirm redirect to login page. Attempt to call a
protected API endpoint with the old token and confirm a 401 response is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any page,
   **When** they click the logout button,
   **Then** they are redirected to `/login` and their session is terminated.

2. **Given** a user who has logged out,
   **When** they attempt to navigate to a protected route,
   **Then** they are redirected to `/login` (not a cached internal page).

3. **Given** a user who has logged out,
   **When** an API call is made with the old access token,
   **Then** the API returns 401 Unauthorized.

---

### Edge Cases

- What happens when the login endpoint receives a request with a malformed JSON body?
  → The API MUST return a 400 Bad Request with a structured error — never a 500.
- What happens if the database is temporarily unreachable during login?
  → The API MUST return a 503 Service Unavailable; no partial session MUST be created.
- What happens if a user submits the login form twice in quick succession (double-click)?
  → Only one session MUST be created; duplicate requests MUST be idempotent.
- What happens when a refresh token is used after the user has logged out?
  → The refresh endpoint MUST reject it with 401 and MUST NOT issue a new access token.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a registered user to authenticate using their email address
  and password.
- **FR-002**: The system MUST reject login attempts where the password does not match, returning
  a generic error that does not reveal whether the email exists (prevents user enumeration).
- **FR-003**: Upon successful login, the system MUST issue a short-lived access token and a
  longer-lived refresh token.
- **FR-004**: The system MUST transparently refresh the access token using the refresh token
  before it expires, without requiring user interaction.
- **FR-005**: All API endpoints except the login and token-refresh endpoints MUST require a
  valid access token and MUST return 401 if the token is absent, malformed, or expired.
- **FR-006**: The system MUST allow a user to explicitly log out, which invalidates both the
  access token and the refresh token immediately.
- **FR-007**: Each user record MUST carry a role: either `admin` or `user`. The role MUST be
  included in the token payload and readable by the frontend without an additional API call.
- **FR-008**: The frontend MUST redirect unauthenticated users to the login page when they
  attempt to access any protected route.
- **FR-009**: The frontend MUST redirect to the originally requested URL (deep link) after
  successful login, if one was captured before the redirect.
- **FR-010**: Passwords MUST be stored as hashed-and-salted digests. Plaintext passwords MUST
  NEVER be stored or logged.
- **FR-011**: The JWT signing secret MUST be loaded from an environment variable or secrets
  manager at runtime. It MUST NOT appear in source code or committed configuration files.
- **FR-012**: The system MUST be designed so that the password-based auth provider can be
  swapped for an OIDC / Azure AD provider without restructuring session management or
  protected-route middleware.

### Key Entities

- **User**: Represents an Aivora platform account.
  Attributes: `id` (UUID), `email` (unique), `display_name`, `hashed_password`, `role`
  (`admin` | `user`), `is_active` (bool), `created_at`, `updated_at`.
- **RefreshToken**: Represents an issued refresh token tied to a user.
  Attributes: `id` (UUID), `user_id` (FK → User), `token_hash`, `issued_at`, `expires_at`,
  `revoked` (bool). Storing a hash (not the raw token) prevents token theft from DB reads.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A registered user can complete the full login flow (open page → submit credentials
  → land on bot list) in under 5 seconds on a standard connection.
- **SC-002**: An unauthenticated request to any protected page results in a redirect to the login
  page within 1 second.
- **SC-003**: After logout, any re-use of the invalidated tokens is rejected 100% of the time
  with no false acceptances.
- **SC-004**: The login form provides inline validation feedback within 300 ms of a submission
  attempt with empty or malformed input — no network round-trip required.
- **SC-005**: Token refresh happens transparently in the background: users MUST NOT be asked to
  re-login during an active working session of up to 8 hours.
- **SC-006**: Zero plaintext passwords appear in any log file, database column, or API response
  under any condition.

---

## Assumptions

- Users are pre-created by an administrator (self-registration is out of scope for this feature).
- Password reset / "Forgot password" flow is explicitly out of scope and will be handled in a
  separate feature.
- Email address is used as the login identifier (not a username).
- The access token lifetime is 15 minutes; the refresh token lifetime is 8 hours. These values
  are configurable via environment variables.
- A single active refresh token per user is sufficient for v1 (multi-device concurrent sessions
  are not required now).
- The "bot list" page that users land on after login is a placeholder at this stage — it need
  not be functional. It is implemented fully in F2 (Bot Registry & Access Control).
- TLS termination occurs at the reverse proxy / load balancer level; the application itself
  communicates over HTTP internally.
- The `admin` role grants no special UI at this stage — role enforcement for admin functions
  is implemented in F2.
