# API Contracts: F1 — Authentication & User Management

**Branch**: `001-user-auth` | **Date**: 2026-06-01
**Base URL**: `/api/v1`
**Transport**: HTTPS (TLS terminated at reverse proxy)
**Token transport**: httpOnly cookies (set by backend, read automatically by browser)

---

## Common Response Envelope

All endpoints return JSON. Errors follow:
```json
{
  "detail": "<human-readable message>"
}
```

Success responses are documented per endpoint.

---

## POST /api/v1/auth/login

Authenticate a user with email and password. Issues access + refresh token cookies on success.

**Auth required**: No

### Request

```
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "s3cr3tPassword!"
}
```

| Field      | Type   | Required | Constraints                  |
|------------|--------|----------|------------------------------|
| `email`    | string | yes      | valid email format, max 255  |
| `password` | string | yes      | 1–128 chars                  |

### Response — 200 OK

Sets two httpOnly cookies:

| Cookie          | Value         | Max-Age   | Flags                              |
|-----------------|---------------|-----------|------------------------------------|
| `aivora_access` | signed JWT    | 900 s     | httpOnly, Secure (prod), SameSite=Lax |
| `aivora_refresh`| opaque token  | 28800 s   | httpOnly, Secure (prod), SameSite=Lax, Path=/api/v1/auth/refresh |

Body:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "Jane Doe",
    "role": "user"
  }
}
```

### Response — 401 Unauthorized

Returned for wrong password, unknown email, or inactive account (identical message — no enumeration).

```json
{ "detail": "Invalid email or password" }
```

### Response — 422 Unprocessable Entity

Returned for malformed request body (missing fields, invalid email format).

```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

### Response — 503 Service Unavailable

Returned when the database is unreachable.

```json
{ "detail": "Service temporarily unavailable. Please try again." }
```

---

## POST /api/v1/auth/refresh

Exchange a valid refresh token cookie for a new access token cookie.
Called automatically by the frontend before the access token expires.

**Auth required**: Valid `aivora_refresh` cookie

### Request

No body. The refresh token is read from the `aivora_refresh` cookie.

### Response — 200 OK

Sets a new `aivora_access` cookie (same flags as login). Optionally rotates the refresh token
(future enhancement — not required for v1).

```json
{ "ok": true }
```

### Response — 401 Unauthorized

Returned when refresh token is missing, revoked, or expired.

```json
{ "detail": "Session expired. Please log in again." }
```

---

## POST /api/v1/auth/logout

Revoke the current refresh token and clear both auth cookies.

**Auth required**: Valid `aivora_access` cookie (or `aivora_refresh` — see note)

### Request

No body.

### Response — 200 OK

Clears both cookies by setting `Max-Age=0` in the `Set-Cookie` headers.

```json
{ "ok": true }
```

### Response — 401 Unauthorized

If no valid session exists (already logged out or expired).

```json
{ "detail": "Not authenticated" }
```

**Note on best-effort logout**: If the access token has already expired but a refresh token
cookie is present, the endpoint SHOULD still revoke the refresh token and clear cookies.
This prevents a scenario where the user cannot log out after their access token expires.

---

## GET /api/v1/users/me

Return the currently authenticated user's profile. Used by the frontend to populate the
user context on app load.

**Auth required**: Valid `aivora_access` cookie

### Response — 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "display_name": "Jane Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2026-06-01T08:00:00Z"
}
```

### Response — 401 Unauthorized

```json
{ "detail": "Not authenticated" }
```

---

## JWT Access Token Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "display_name": "Jane Doe",
  "role": "user",
  "exp": 1748772000,
  "iat": 1748771100,
  "type": "access"
}
```

| Claim          | Description                                        |
|----------------|----------------------------------------------------|
| `sub`          | User UUID (primary identifier)                     |
| `email`        | User email (for display only in frontend)          |
| `display_name` | User display name (avoids extra API call)          |
| `role`         | `"admin"` or `"user"` (for UI gating)              |
| `exp`          | Unix timestamp — access token expires in 15 min    |
| `iat`          | Unix timestamp — issued at                         |
| `type`         | Always `"access"` (distinguishes from refresh)     |

**Signing algorithm**: HS256 (symmetric HMAC-SHA256). Key loaded from `JWT_SECRET_KEY` env var.
Minimum recommended key length: 32 bytes (256 bits), generated with `openssl rand -hex 32`.

---

## Frontend Middleware Contract

The Next.js `middleware.ts` checks for the `aivora_access` cookie on every request to a
protected route. If absent or clearly expired (by `exp` claim decode), it redirects to
`/login?next=<encoded-original-url>`. The backend is the authoritative validator — the
middleware only performs a lightweight client-side check to avoid unnecessary round-trips.

Protected route pattern: `/((?!login|api|_next/static|_next/image|favicon.ico).*)` — i.e.,
everything except the login page, API routes, and Next.js static assets.
