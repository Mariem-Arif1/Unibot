---
description: "Task list for F1 — Authentication & User Management"
---

# Tasks: F1 — Authentication & User Management

**Input**: Design documents from `specs/001-user-auth/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/auth-api.md ✅

**Tests**: Integration tests are included — required by the Aivora constitution for all
authentication, session persistence, and user-enumeration code paths.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Initialize project structure and shared tooling before any feature code is written.

- [x] T001 Create `backend/` directory structure: `src/core/`, `src/models/`, `src/schemas/`, `src/services/`, `src/providers/`, `src/api/v1/`, `src/scripts/`, `tests/integration/`, `alembic/versions/`
- [x] T002 Create `backend/requirements.txt` with pinned versions: fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, alembic, passlib[bcrypt], PyJWT, pydantic-settings, httpx, pytest, pytest-asyncio
- [x] T003 [P] Initialize Next.js 14 project in `frontend/` with TypeScript, App Router, and Tailwind CSS (`npx create-next-app@latest frontend --typescript --app --tailwind`)
- [x] T004 [P] Create `docker-compose.yml` at repository root with PostgreSQL 15 service (port 5432, persistent volume, health-check) and stub entries for backend and frontend services
- [x] T005 [P] Create `backend/.env.example` documenting all required env vars: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ACCESS_EXPIRE_MINUTES` (default 15), `JWT_REFRESH_EXPIRE_HOURS` (default 8), `BCRYPT_ROUNDS` (default 12)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. No user story work begins
until this phase is complete.

**⚠️ CRITICAL**: All of US1, US2, US3 are blocked until this phase is done.

- [x] T006 Implement `backend/src/core/config.py` using `pydantic-settings`: `Settings` class loading `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ACCESS_EXPIRE_MINUTES`, `JWT_REFRESH_EXPIRE_HOURS`, `BCRYPT_ROUNDS` from environment; singleton `get_settings()` function
- [x] T007 Implement `backend/src/core/database.py`: async SQLAlchemy engine (`create_async_engine`), `AsyncSession` factory, `Base` declarative base, and `get_session` async generator dependency for FastAPI
- [x] T008 [P] Implement `backend/src/core/security.py`: `hash_password(plain)`, `verify_password(plain, hashed)` using passlib bcrypt; `create_access_token(payload)` and `decode_access_token(token)` using PyJWT HS256; `hash_token(raw_token)` → SHA-256 hex for refresh token storage
- [x] T009 [P] Create `backend/src/models/user.py`: `UserRole` enum (`admin`, `user`); `User` SQLAlchemy mapped class with columns: `id` (UUID PK), `email` (unique), `display_name`, `hashed_password`, `role`, `is_active`, `created_at`, `updated_at`; relationship to `RefreshToken`
- [x] T010 [P] Create `backend/src/models/refresh_token.py`: `RefreshToken` SQLAlchemy mapped class with columns: `id` (UUID PK), `user_id` (FK → users.id CASCADE DELETE), `token_hash` (VARCHAR 64, unique), `issued_at`, `expires_at`, `revoked` (bool default False); relationship back to `User`
- [x] T011 Configure `backend/alembic/env.py` for async SQLAlchemy (use `run_async_migrations` pattern); generate initial migration `backend/alembic/versions/001_create_users_and_refresh_tokens.py` creating both tables with indexes (`idx_users_email`, `idx_refresh_tokens_user_id`, `idx_refresh_tokens_token_hash`)
- [x] T012 Run `alembic upgrade head` against the Docker PostgreSQL instance and verify both tables exist with correct columns and indexes
- [x] T013 Create `backend/src/main.py`: FastAPI app factory (`create_app()`), CORS middleware (configurable origins from env), include API v1 router, `/health` endpoint returning `{"status": "ok"}`
- [x] T014 Create `backend/src/api/v1/router.py` mounting `auth` and `users` sub-routers under `/api/v1`
- [x] T015 [P] Create `backend/tests/conftest.py`: async pytest fixtures for `test_client` (httpx `AsyncClient` against the FastAPI app), `test_db` (creates isolated test database schema, yields session, drops after test), `test_user` (inserts a seeded user row before test)

**Checkpoint**: `GET /health` → 200, both tables exist, test fixtures pass — user story work can begin.

---

## Phase 3: User Story 1 — Registered User Logs In (Priority: P1) 🎯 MVP

**Goal**: A registered user can submit email + password and receive JWT cookies; the browser
redirects to `/bots`.

**Independent Test**: Seed a user → `POST /api/v1/auth/login` with valid credentials → assert
HTTP 200, `aivora_access` and `aivora_refresh` cookies set → open `http://localhost:3000/login`,
submit credentials, confirm browser redirects to `/bots`.

### Implementation for User Story 1

- [x] T016 [P] [US1] Create `backend/src/schemas/auth.py`: `LoginRequest(email, password)`, `LoginResponse(user: UserOut)`, `TokenPayload(sub, email, display_name, role, exp, iat, type)` Pydantic models
- [x] T017 [P] [US1] Create `backend/src/schemas/user.py`: `UserOut(id, email, display_name, role, is_active, created_at)` Pydantic model — MUST NOT include `hashed_password`
- [x] T018 [US1] Implement `backend/src/providers/password_provider.py`: `PasswordAuthProvider` class with `authenticate(email, password, session) -> User | None`; looks up user by email, verifies bcrypt hash, returns `None` for wrong password OR unknown email (identical timing, no enumeration); returns `None` for inactive users
- [x] T019 [US1] Implement `AuthService.login()` in `backend/src/services/auth_service.py`: calls `PasswordAuthProvider.authenticate()`, raises HTTP 401 with message `"Invalid email or password"` on `None`; generates raw opaque refresh token (32-byte `secrets.token_hex`); stores `hash_token(raw)` in `refresh_tokens` table (revoke any prior active token for user first — single-session policy); creates JWT access token; returns `LoginResponse` and sets `aivora_access` (httpOnly, 900 s) and `aivora_refresh` (httpOnly, 28800 s, Path=/api/v1/auth/refresh) cookies on the FastAPI `Response`; logs login event (user_id, outcome, timestamp)
- [x] T020 [US1] Create `POST /api/v1/auth/login` endpoint in `backend/src/api/v1/auth.py`: accepts `LoginRequest`, calls `AuthService.login()`, returns `LoginResponse`; handles `RequestValidationError` → 422, `ServiceUnavailableError` (DB down) → 503
- [x] T021 [US1] Create `backend/src/scripts/seed_user.py`: CLI (`argparse`) accepting `--email`, `--password`, `--display-name`, `--role`; hashes password with `hash_password()`; inserts `User` row; prints `[OK] User created: <email>`
- [x] T022 [US1] Create `frontend/src/services/authService.ts`: `login(email, password)` calls `POST /api/v1/auth/login`, returns `UserOut` on success; `logout()` calls `POST /api/v1/auth/logout`; `refreshToken()` calls `POST /api/v1/auth/refresh`
- [x] T023 [US1] Create `frontend/src/context/AuthContext.tsx`: `AuthProvider` component that decodes the `aivora_access` JWT payload client-side (no verification — UI only) to populate `{ user, isLoading }`; exposes `useAuth()` hook
- [x] T024 [US1] Create `frontend/src/components/auth/LoginForm.tsx`: controlled form with email and password fields; inline validation (required, email format) before submit; calls `authService.login()`; shows `"Invalid email or password"` error on 401; redirects to `?next` param or `/bots` on success
- [x] T025 [US1] Create `frontend/src/app/(auth)/login/page.tsx`: renders `LoginForm`; if user is already authenticated (cookie present), redirect to `/bots` to avoid re-login
- [x] T026 [US1] Create `frontend/src/app/(protected)/bots/page.tsx`: placeholder page showing `"You are logged in as {display_name}"` — sufficient to validate the US1 redirect independently
- [x] T027 [US1] Integration test in `backend/tests/integration/test_login.py`: (a) valid credentials → 200, cookies set, body contains user fields; (b) wrong password → 401 `"Invalid email or password"`; (c) unknown email → 401 same message; (d) inactive user → 401 same message; (e) empty body → 422

**Checkpoint**: US1 independently functional — user can log in via both API and browser UI.

---

## Phase 4: User Story 2 — Protected Route Enforcement (Priority: P2)

**Goal**: Authenticated users access protected pages normally; unauthenticated users are
redirected to `/login`; the access token is transparently refreshed before expiry.

**Independent Test**: (1) With `aivora_access` cookie → `GET /api/v1/users/me` → 200. (2)
Without cookie → 401. (3) In browser: navigate to `/bots` without login → redirect to
`/login?next=/bots`; log in → redirect back to `/bots`.

### Implementation for User Story 2

- [x] T028 [US2] Implement `get_current_user` FastAPI dependency in `backend/src/dependencies.py`: reads `aivora_access` cookie from request, calls `decode_access_token()`, raises HTTP 401 if absent/invalid/expired; returns `CurrentUser(id, email, display_name, role)`
- [x] T029 [US2] Create `GET /api/v1/users/me` endpoint in `backend/src/api/v1/users.py`: uses `get_current_user` dependency; returns `UserOut` for the authenticated user
- [x] T030 [US2] Implement `AuthService.refresh()` in `backend/src/services/auth_service.py`: reads `aivora_refresh` cookie, hashes it, looks up `RefreshToken` row; raises 401 if not found, revoked, or expired; issues new `aivora_access` cookie (900 s); logs refresh event
- [x] T031 [US2] Create `POST /api/v1/auth/refresh` endpoint in `backend/src/api/v1/auth.py`: calls `AuthService.refresh()`, returns `{"ok": true}`
- [x] T032 [US2] Create `frontend/src/middleware.ts`: Next.js edge middleware matching all routes except `/login`, `/api/*`, `/_next/*`, `/favicon.ico`; reads `aivora_access` cookie; if absent, redirects to `/login?next=<encoded-path>`; if present but `exp` claim is within 60 s of expiry, calls `/api/v1/auth/refresh` before continuing
- [x] T033 [US2] Integration test in `backend/tests/integration/test_protected_routes.py`: (a) valid access cookie → `GET /users/me` → 200; (b) no cookie → 401; (c) malformed token → 401; (d) expired token → 401
- [x] T034 [US2] Integration test in `backend/tests/integration/test_refresh.py`: (a) valid refresh cookie → 200, new `aivora_access` cookie set; (b) revoked refresh token → 401; (c) expired refresh token → 401; (d) no cookie → 401

**Checkpoint**: US1 and US2 independently functional — protected routing enforced front and back.

---

## Phase 5: User Story 3 — User Logs Out (Priority: P3)

**Goal**: Clicking logout revokes the session server-side; old tokens are rejected on all
subsequent requests.

**Independent Test**: Log in → call `POST /api/v1/auth/logout` → 200. Then call `GET /users/me`
with the old cookie → 401. Then call `POST /auth/refresh` with the old refresh cookie → 401.

### Implementation for User Story 3

- [x] T035 [US3] Implement `AuthService.logout()` in `backend/src/services/auth_service.py`: reads `aivora_refresh` cookie, hashes it, sets `revoked=True` on matching `RefreshToken` row (no error if not found — best-effort); clears `aivora_access` and `aivora_refresh` cookies (`Max-Age=0`); logs logout event
- [x] T036 [US3] Create `POST /api/v1/auth/logout` endpoint in `backend/src/api/v1/auth.py`: calls `AuthService.logout()`, returns `{"ok": true}`; MUST clear cookies even if access token is already expired
- [x] T037 [US3] Add logout flow to `frontend/src/services/authService.ts` `logout()` function (already stubbed in T022); add a "Log out" button to `frontend/src/app/(protected)/bots/page.tsx` that calls `authService.logout()` then redirects to `/login`
- [x] T038 [US3] Integration test in `backend/tests/integration/test_logout.py`: (a) `POST /logout` → 200, cookies cleared; (b) subsequent `GET /users/me` with old token → 401; (c) subsequent `POST /refresh` with revoked refresh token → 401; (d) `POST /logout` with no session → 200 (idempotent)

**Checkpoint**: All three user stories independently functional and tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Observability, hardening, and end-to-end validation.

- [x] T039 [P] Add structured audit logging to `backend/src/services/auth_service.py` for all three operations: each log entry MUST include `event` (login/refresh/logout), `user_id`, `outcome` (success/failure), `reason` (on failure), `timestamp` (ISO 8601); use Python `logging` module with JSON formatter
- [x] T040 [P] Add `/health` endpoint response to include DB connectivity check: try a `SELECT 1` and return `{"status":"ok","db":"ok"}` or `{"status":"degraded","db":"unreachable"}` with HTTP 503 on DB failure — update `backend/src/main.py`
- [x] T041 [P] Create `frontend/.env.local.example` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [x] T042 Run all integration tests (`pytest backend/tests/`) and confirm all pass against the Docker PostgreSQL instance
- [x] T043 Execute all steps in `specs/001-user-auth/quickstart.md` manually and confirm every checklist item passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T003/T004/T005 can run in parallel with T001/T002
- **Phase 2 (Foundational)**: Requires Phase 1 complete; T008/T009/T010/T015 can run in parallel; T011 requires T009+T010; T012 requires T011
- **Phase 3 (US1 — P1)**: Requires Phase 2 complete; T016/T017 in parallel; T022/T023/T024/T025/T026 frontend tasks can run in parallel with backend T018/T019/T020/T021
- **Phase 4 (US2 — P2)**: Requires Phase 2; T028→T029 sequential; T030→T031 sequential; T032 independent; can start in parallel with Phase 3
- **Phase 5 (US3 — P3)**: Requires T018/T019 from US1 (login endpoint) and T028 (get_current_user dep); T035→T036 sequential
- **Phase 6 (Polish)**: Requires all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational phase
- **US2 (P2)**: Depends on Foundational + `get_current_user` dep (T028); CAN start in parallel with US1
- **US3 (P3)**: Depends on `AuthService.login()` (T019) and `AuthService.refresh()` (T030) being complete

### Within Each User Story

- Schemas (T016/T017) before services (T018/T019)
- Provider (T018) before AuthService (T019)
- AuthService (T019) before endpoint (T020)
- Endpoint before frontend calls (T022–T026)

---

## Parallel Execution Examples

### Phase 2 Parallelism

```
Parallel group A (no dependencies on each other):
  T008 — security.py (hashing + JWT utilities)
  T009 — models/user.py
  T010 — models/refresh_token.py
  T015 — tests/conftest.py

Then sequentially:
  T011 (needs T009 + T010) → T012 (needs T011)
```

### Phase 3 + Phase 4 Parallelism (two developers)

```
Developer A: Phase 3 (US1) — login flow
  T016 → T018 → T019 → T020 → T021 → T027

Developer B: Phase 4 (US2) — protection + refresh
  T028 → T029 → T030 → T031 → T032 → T033 → T034
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (seed DB, verify health check)
3. Complete Phase 3: User Story 1 (login API + login UI + placeholder /bots)
4. **STOP and VALIDATE**: `POST /login` works via curl AND browser redirects to `/bots`
5. Demo to stakeholders — this is a shippable auth gate

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1: login → MVP (can demo and test independently)
3. US2: protected routing + refresh → session management complete
4. US3: logout → full session lifecycle
5. Polish → production-ready

### Parallel Team Strategy

With two developers available after Phase 2:
- Dev A owns US1 (login) and US3 (logout) — server-side session lifecycle
- Dev B owns US2 (protected routes + refresh) — independent of US1 on the backend

---

## Notes

- `[P]` tasks operate on different files and have no incomplete-task dependencies
- `[Story]` label maps each task to its user story for traceability and independent delivery
- Integration tests MUST run against the real PostgreSQL container (not mocks) — constitutional requirement
- Seed the test user with `backend/src/scripts/seed_user.py` before manual validation
- Never store the raw refresh token — only `hash_token(raw)` goes in the DB
- JWT signing secret must come from env; verify `.env.example` is committed but `.env` is in `.gitignore`
