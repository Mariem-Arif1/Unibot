# Research: F1 — Authentication & User Management

**Branch**: `001-user-auth` | **Date**: 2026-06-01

---

## Decision 1: Password Hashing Algorithm

**Decision**: Use **bcrypt** via `passlib[bcrypt]`.

**Rationale**: bcrypt is the battle-tested standard for password hashing in Python web applications.
`passlib` provides a safe, high-level API that handles salting, cost factor configuration, and
upgrade paths automatically. While argon2id is the current OWASP top recommendation for new
systems, bcrypt is universally supported, simpler to operate, and acceptable for an internal
platform at this scale. A cost factor of 12 is used (adjustable via environment variable).

**Alternatives considered**:
- `argon2-cffi` (argon2id): Stronger recommendation for greenfield projects but adds a C library
  dependency and introduces more operational complexity. Can be adopted later as a `passlib`
  scheme upgrade without breaking existing password hashes.
- `hashlib.scrypt`: Available in stdlib but lower-level; requires manual salt management.

---

## Decision 2: JWT Library

**Decision**: Use **PyJWT** (`PyJWT>=2.8`).

**Rationale**: PyJWT is the most widely used JWT library in the Python ecosystem, has a simple
API, is actively maintained, and has no heavy transitive dependencies. It supports HS256 (HMAC)
for symmetric signing and RS256 for asymmetric signing (useful when Azure AD is introduced).

**Alternatives considered**:
- `python-jose`: Also popular with FastAPI tutorials but carries more dependencies (cryptography,
  ecdsa, rsa) and has had past security advisories. No advantage for our use case.
- `authlib`: Full OAuth2/OIDC library — overkill for the password-auth phase; will be evaluated
  when Azure AD integration is implemented.

---

## Decision 3: Token Transport — httpOnly Cookies

**Decision**: Deliver both access token and refresh token as **httpOnly, Secure, SameSite=Lax
cookies** set by the backend on successful login.

**Rationale**: httpOnly cookies are inaccessible to JavaScript, eliminating the XSS token-theft
attack vector that affects localStorage-stored tokens. The backend sets cookies on the response;
the browser automatically includes them on subsequent same-origin requests. `SameSite=Lax`
provides CSRF protection for state-mutating requests while allowing top-level GET navigations.

Access token cookie: `aivora_access` — short-lived (15 min), httpOnly, Secure in prod.
Refresh token cookie: `aivora_refresh` — longer-lived (8 h), httpOnly, Secure, Path=/api/auth/refresh.

**Alternatives considered**:
- Access token in memory + refresh token in httpOnly cookie: Prevents access token XSS but
  requires background refresh logic on every page load and adds complexity for a v1 with few
  concurrent users.
- localStorage: Simple but vulnerable to XSS. Rejected per security requirements.
- Authorization header (Bearer): Requires JavaScript to read and attach the token — incompatible
  with httpOnly cookie approach.

---

## Decision 4: Refresh Token Invalidation Strategy

**Decision**: Store a **hash of the refresh token** in the `refresh_tokens` PostgreSQL table
with a `revoked` boolean column. On logout, set `revoked = true`. On each refresh request,
verify the token hash exists and `revoked = false`.

**Rationale**: Short-lived access tokens (15 min) do not need server-side tracking — they are
stateless and expire naturally. Refresh tokens (8 h) must be revokable for logout to be
meaningful. Storing only the hash (SHA-256 of the raw token) means a database breach does
not expose usable tokens.

**Alternatives considered**:
- Redis token blacklist: Faster lookup but adds an operational dependency. Unnecessary for
  an internal platform at current scale. Can be introduced later if refresh-token lookup
  becomes a latency bottleneck.
- Opaque tokens with full value stored: Storing the raw token creates a DB-theft risk.

---

## Decision 5: Database Access Pattern

**Decision**: Use **SQLAlchemy 2.x with async support** (`asyncpg` driver) and **Alembic** for
migrations.

**Rationale**: SQLAlchemy 2.x provides a modern, type-annotated ORM with async session support
that integrates cleanly with FastAPI's async request handlers. Alembic is the standard migration
tool for SQLAlchemy projects. `asyncpg` is the fastest async PostgreSQL driver for Python.

**Alternatives considered**:
- `databases` + raw SQL: Lighter but loses ORM benefits (type safety, relationships, migration
  integration). Not warranted for a multi-feature platform.
- Tortoise ORM / Beanie: Less mature ecosystems; SQLAlchemy has far more production references.

---

## Decision 6: Frontend Auth Architecture

**Decision**: Use **Next.js 14 App Router with a `middleware.ts`** file for server-side protected
route enforcement, plus a client-side `AuthContext` for UI-state (e.g., user name, role display).

**Rationale**: Next.js middleware runs at the edge before a page renders, making it the correct
place to check for the presence of the access token cookie and redirect to `/login` if missing.
This avoids the flash of protected content that occurs with client-only guards. The `AuthContext`
provides the decoded user payload (sub, role, display_name) to components without an extra API call.

**Token decode on frontend**: The access token is a JWT. The frontend decodes (but does NOT
verify, since it lacks the signing secret) the payload client-side only to read display name
and role for UI purposes. All actual authorization decisions happen server-side (API middleware).

**Alternatives considered**:
- `next-auth`: Full-featured but adds significant abstraction overhead for a simple
  username/password flow; will be re-evaluated when Azure AD OIDC is introduced.
- Client-side only guards (useEffect redirect): Creates a visible flash of the protected page
  before redirect; rejected for UX and security reasons.

---

## Decision 7: Azure AD Upgrade Path

**Decision**: Introduce an **`AuthProvider` abstraction** in the backend with a
`PasswordAuthProvider` implementation today. The FastAPI dependency that validates tokens will
accept a provider-agnostic `CurrentUser` type. When Azure AD is introduced, an `OIDCAuthProvider`
is added without touching session management, protected-route middleware, or any downstream
feature code.

**Rationale**: FR-012 requires this decoupling. Encoding provider logic directly into route
handlers would require changes across every feature when Azure AD is added.
