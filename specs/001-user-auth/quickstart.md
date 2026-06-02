# Quickstart: F1 — Authentication & User Management

**Branch**: `001-user-auth` | **Date**: 2026-06-01

This guide validates the implemented feature end-to-end. Run these steps after implementation
is complete and the stack is running locally.

---

## Prerequisites

- Docker + Docker Compose (or a local PostgreSQL 15+ instance)
- Python 3.11+ with `pip`
- Node.js 20+ with `npm` or `pnpm`
- `curl` or a REST client (Postman, Bruno, HTTPie)

---

## Step 1: Start the backend

```bash
cd backend
cp .env.example .env          # set JWT_SECRET_KEY, DATABASE_URL
pip install -r requirements.txt
alembic upgrade head           # create users + refresh_tokens tables
uvicorn src.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

## Step 2: Seed a test user

```bash
cd backend
python -m src.scripts.seed_user \
  --email test@aivora.local \
  --password "TestPass123!" \
  --display-name "Test User" \
  --role user
```

Expected output: `[OK] User created: test@aivora.local`

---

## Step 3: Test login via API

```bash
curl -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@aivora.local","password":"TestPass123!"}'
```

Expected response (HTTP 200):
```json
{
  "user": {
    "id": "<uuid>",
    "email": "test@aivora.local",
    "display_name": "Test User",
    "role": "user"
  }
}
```

Two cookies (`aivora_access`, `aivora_refresh`) should be set in `cookies.txt`.

---

## Step 4: Access a protected endpoint

```bash
curl -b cookies.txt http://localhost:8000/api/v1/users/me
```

Expected response (HTTP 200):
```json
{
  "id": "<uuid>",
  "email": "test@aivora.local",
  "display_name": "Test User",
  "role": "user",
  "is_active": true,
  "created_at": "..."
}
```

Without cookies: expect HTTP 401 `{"detail":"Not authenticated"}`.

---

## Step 5: Test token refresh

```bash
# Wait for access token to expire (or set JWT_ACCESS_EXPIRE_MINUTES=0 for testing)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8000/api/v1/auth/refresh
```

Expected response (HTTP 200): `{"ok":true}` and a new `aivora_access` cookie.

---

## Step 6: Test logout

```bash
curl -b cookies.txt -X POST http://localhost:8000/api/v1/auth/logout
```

Expected response (HTTP 200): `{"ok":true}`

Then attempt to access a protected endpoint:
```bash
curl -b cookies.txt http://localhost:8000/api/v1/users/me
```

Expected: HTTP 401 `{"detail":"Not authenticated"}` — old tokens rejected.

---

## Step 7: Test the frontend

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

1. You should be redirected to `/login` automatically.
2. Enter credentials from Step 2 → expect redirect to `/bots` (placeholder page).
3. Navigate directly to `/bots` while logged in → page loads normally.
4. Click "Log out" → expect redirect to `/login`.
5. Navigate to `/bots` after logout → expect redirect to `/login`.

---

## Step 8: Verify security constraints

```bash
# Wrong password → generic error (no enumeration)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@aivora.local","password":"WrongPassword"}'
# Expect: 401 {"detail":"Invalid email or password"}

# Non-existent email → same generic error
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@aivora.local","password":"anything"}'
# Expect: 401 {"detail":"Invalid email or password"}

# Verify no plaintext password in database
# Connect to PostgreSQL and run:
# SELECT email, hashed_password FROM users WHERE email = 'test@aivora.local';
# hashed_password should start with "$2b$" (bcrypt) — never the raw password.
```

---

## All checks pass when:

- [x] `GET /health` → 200
- [x] Login with valid credentials → 200 + cookies set
- [x] Login with wrong password → 401 (generic message)
- [x] Login with unknown email → 401 (same generic message)
- [x] `GET /users/me` with cookie → 200 + user profile
- [x] `GET /users/me` without cookie → 401
- [x] Token refresh → 200 + new access cookie
- [x] Logout → 200, then protected endpoint → 401
- [x] Frontend redirect to `/login` when not authenticated
- [x] Frontend redirect to `/bots` after successful login
- [x] No plaintext password in DB
