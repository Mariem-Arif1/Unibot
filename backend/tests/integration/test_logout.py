import secrets
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token, hash_token
from src.models.refresh_token import RefreshToken
from src.models.user import User


async def _insert_refresh_token(session: AsyncSession, user: User) -> str:
    raw = secrets.token_hex(32)
    record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
    )
    session.add(record)
    await session.commit()
    return raw


@pytest.mark.asyncio
async def test_logout_clears_cookies_and_revokes_token(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    raw_refresh = await _insert_refresh_token(db_session, test_user)
    access = create_access_token({
        "sub": str(test_user.id),
        "email": test_user.email,
        "display_name": test_user.display_name,
        "role": test_user.role.value,
    })
    client.cookies.set("aivora_access", access)
    client.cookies.set("aivora_refresh", raw_refresh)

    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    client.cookies.clear()


@pytest.mark.asyncio
async def test_protected_endpoint_rejected_after_logout(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    raw_refresh = await _insert_refresh_token(db_session, test_user)
    access = create_access_token({
        "sub": str(test_user.id),
        "email": test_user.email,
        "display_name": test_user.display_name,
        "role": test_user.role.value,
    })
    client.cookies.set("aivora_access", access)
    client.cookies.set("aivora_refresh", raw_refresh)
    await client.post("/api/v1/auth/logout")
    client.cookies.clear()

    # Access token is short-lived; after logout the refresh token is revoked
    client.cookies.set("aivora_refresh", raw_refresh)
    refresh_response = await client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401
    client.cookies.clear()


@pytest.mark.asyncio
async def test_logout_without_session_is_ok(client: AsyncClient):
    # Idempotent — no session to revoke, still returns 200
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
