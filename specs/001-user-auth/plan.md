# Implementation Plan: F1 — Authentication & User Management

**Branch**: `001-user-auth` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-auth/spec.md`

---

## Summary

Implement the foundational authentication layer for the Aivora platform: email/password login,
JWT access + refresh token lifecycle via httpOnly cookies, role-aware user records, protected
route enforcement on both the FastAPI backend and the Next.js frontend, and a clean
`AuthProvider` abstraction so Azure AD / OIDC can be plugged in later without restructuring
session management.

---

## Technical Context

**Language/Version**: Python 3.11+ (backend) · TypeScript / Node.js 20+ (frontend)

**Primary Dependencies**:
- Backend: FastAPI 0.111+, SQLAlchemy 2.x (async), asyncpg, Alembic, passlib[bcrypt], PyJWT 2.8+, pydantic 2.x
- Frontend: Next.js 14+ (App Router), React 18, TypeScript

**Storage**: PostgreSQL 15+ — tables: `users`, `refresh_tokens`

**Testing**: pytest + httpx (backend async integration tests) · Jest + React Testing Library (frontend)

**Target Platform**: Self-hosted Linux server (Docker Compose in development, bare metal or VM
in production behind an nginx/Caddy reverse proxy)

**Project Type**: Web application — FastAPI backend (`backend/`) + Next.js frontend (`frontend/`)

**Performance Goals**: Login API response < 500 ms p95 · Protected page redirect < 1 s

**Constraints**:
- TLS termination at reverse proxy; app communicates HTTP internally
- JWT_SECRET_KEY MUST be loaded from environment — never committed
- No plaintext passwords in any log, DB column, or API response

**Scale/Scope**: Internal platform, ~50–200 users initially

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Access-Based Bot Authorization | Auth layer is the prerequisite. JWT middleware enforces identity on every request. Bots are gated in F2; this feature provides the identity token. | ✅ PASS |
| II. Session & Chat Persistence | Not applicable to auth tokens directly. Sessions are chat-level (F3). | ✅ N/A |
| III. Tool-Equipped LLMs | Not applicable to auth. | ✅ N/A |
| IV. ERP Integration | Not applicable to auth. | ✅ N/A |
| V. Multi-LLM Provider Support | Not applicable to auth. | ✅ N/A |
| VI. Web-First UX | Login page is a responsive web form. Frontend auth flow is browser-based with no install. | ✅ PASS |
| Security & Compliance — Authentication | Central IdP deferred; password auth is an explicit stepping stone. TLS enforced. No shared credentials. JWT secret from env. | ✅ PASS |
| Security & Compliance — Secret Management | JWT secret loaded from env var / secrets manager. Never in source. | ✅ PASS |
| Security & Compliance — Audit Logging | Login, logout, and refresh events MUST be logged with user ID, timestamp, and outcome. | ✅ PASS (required in implementation) |
| Development Standards — API-first | All auth capabilities exposed as versioned REST endpoints before frontend is built. | ✅ PASS |
| Development Standards — Integration Tests | Auth, session persistence, and user-enumeration paths MUST have integration tests hitting a real DB. | ✅ PASS (required in implementation) |

**No violations — gate cleared.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              ← This file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-api.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
backend/
├── src/
│   ├── core/
│   │   ├── config.py           # Settings loaded from env (JWT secret, DB URL, token TTLs)
│   │   ├── database.py         # Async SQLAlchemy engine + session factory
│   │   └── security.py         # Password hashing (passlib), JWT sign/verify (PyJWT),
│   │                           # SHA-256 token hashing
│   ├── models/
│   │   ├── user.py             # User ORM model + UserRole enum
│   │   └── refresh_token.py    # RefreshToken ORM model
│   ├── schemas/
│   │   ├── auth.py             # LoginRequest, LoginResponse, TokenPayload
│   │   └── user.py             # UserOut (response schema, no hashed_password)
│   ├── services/
│   │   └── auth_service.py     # AuthService: login(), refresh(), logout(),
│   │                           # get_current_user() — provider-agnostic interface
│   ├── providers/
│   │   └── password_provider.py # PasswordAuthProvider — implements AuthProvider protocol
│   ├── api/
│   │   └── v1/
│   │       ├── router.py       # Mounts all v1 sub-routers
│   │       ├── auth.py         # POST /auth/login, /auth/refresh, /auth/logout
│   │       └── users.py        # GET /users/me
│   ├── dependencies.py         # FastAPI deps: get_current_user, require_role
│   ├── main.py                 # FastAPI app factory, CORS, cookie middleware
│   └── scripts/
│       └── seed_user.py        # CLI helper to create admin/user accounts
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_create_users_and_refresh_tokens.py
├── tests/
│   ├── integration/
│   │   ├── test_login.py
│   │   ├── test_refresh.py
│   │   ├── test_logout.py
│   │   └── test_protected_routes.py
│   └── conftest.py             # Async test client, test DB fixtures
├── .env.example
└── requirements.txt

frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx    # Login form (email + password)
│   │   └── (protected)/
│   │       └── bots/
│   │           └── page.tsx    # Placeholder bot list (P1 independent test target)
│   ├── components/
│   │   └── auth/
│   │       └── LoginForm.tsx
│   ├── context/
│   │   └── AuthContext.tsx     # Provides decoded user (sub, role, display_name) to UI
│   ├── services/
│   │   └── authService.ts      # Thin wrappers: login(), logout(), refreshToken()
│   └── middleware.ts            # Next.js edge middleware — cookie check + redirect
├── .env.local.example
└── package.json
```

**Structure Decision**: Web application (Option 2) — separate `backend/` and `frontend/` trees.

---

## Complexity Tracking

No constitution violations requiring justification.

---

*Generated artifacts: [research.md](research.md) · [data-model.md](data-model.md) · [contracts/auth-api.md](contracts/auth-api.md) · [quickstart.md](quickstart.md)*
