# Data Model: F1 — Authentication & User Management

**Branch**: `001-user-auth` | **Date**: 2026-06-01

---

## Entity: `users`

Represents a registered Aivora platform account.

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    display_name  VARCHAR(100) NOT NULL,
    hashed_password TEXT NOT NULL,               -- argon2id or bcrypt hash via passlib
    role          VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
```

**Validation rules**:
- `email`: MUST be a valid email format; stored lowercase; max 255 chars.
- `display_name`: 1–100 chars; no leading/trailing whitespace.
- `hashed_password`: MUST be a passlib-managed hash string; NEVER the raw password.
- `role`: MUST be one of `'admin'` or `'user'`; enforced at application level (Enum).
- `is_active`: When `false`, login MUST be rejected with a generic 401 (no enumeration).

**Notes**:
- `updated_at` is maintained by an `ON UPDATE` trigger or application-layer update.
- No self-registration: rows are inserted by admin tooling or a seeding script.

---

## Entity: `refresh_tokens`

Represents an active refresh token issued to a user. Only the hash is stored.

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,    -- SHA-256 hex digest of the raw token
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

**Validation rules**:
- `token_hash`: SHA-256 hex (64 chars) of the raw opaque token. Never store the raw token.
- `expires_at`: Set to `issued_at + JWT_REFRESH_EXPIRE_HOURS` (default 8 h) at creation.
- `revoked`: Set to `true` on explicit logout. Expired tokens are not deleted immediately
  but are rejected at the application layer; a periodic cleanup job removes them.

**Lifecycle**:
1. **Login**: One row inserted per successful login. If a prior active row exists for the
   user, it is revoked (single-session policy for v1).
2. **Refresh**: Row looked up by `token_hash`; rejected if `revoked = true` or `expires_at < now()`.
3. **Logout**: `revoked` set to `true` for the user's current refresh token row.
4. **Cleanup**: A scheduled task (or on-login sweep) deletes rows where `expires_at < now()`.

---

## Relationships

```
users (1) ──< refresh_tokens (N)
  id            user_id (FK, CASCADE DELETE)
```

A user can have at most one active (non-revoked, non-expired) refresh token at a time under
the v1 single-session policy.

---

## SQLAlchemy Models (Python)

```python
# backend/src/models/user.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    user  = "user"

class User(Base):
    __tablename__ = "users"

    id:               Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:            Mapped[str]        = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name:     Mapped[str]        = mapped_column(String(100), nullable=False)
    hashed_password:  Mapped[str]        = mapped_column(Text, nullable=False)
    role:             Mapped[UserRole]   = mapped_column(Enum(UserRole), nullable=False, default=UserRole.user)
    is_active:        Mapped[bool]       = mapped_column(Boolean, nullable=False, default=True)
    created_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
```

```python
# backend/src/models/refresh_token.py
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id:          Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:     Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash:  Mapped[str]        = mapped_column(String(64), unique=True, nullable=False, index=True)
    issued_at:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at:  Mapped[datetime]   = mapped_column(DateTime(timezone=True), nullable=False)
    revoked:     Mapped[bool]       = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
```

---

## Alembic Migration Notes

- Initial migration creates both tables.
- `users.role` uses a PostgreSQL `ENUM` type — Alembic must use `server_default` and handle
  enum creation before table creation in the migration script.
- `updated_at` trigger is optional; the application layer updates the field on writes.
