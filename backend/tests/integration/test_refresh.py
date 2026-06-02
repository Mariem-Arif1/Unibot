import secrets
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import hash_token
from src.models.refresh_token import RefreshToken
from src.models.user import User


async def _insert_refresh_token(
    session: AsyncSession, user: User, revoked: bool = False, expired: bool = False
) -> str:
    raw = secrets.token_hex(32)
    expires = datetime.now(timezone.utc) + (
        timedelta(hours=-1) if expired else timedelta(hours=8)
    )
    record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=expires,
        revoked=revoked,
    )
    session.add(record)
    await session.commit()
    return raw


@pytest.mark.asyncio
async def test_refresh_with_valid_token(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    raw = await _insert_refresh_token(db_session, test_user)
    client.cookies.set("aivora_refresh", raw)
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert "aivora_access" in response.cookies
    client.cookies.clear()


@pytest.mark.asyncio
async def test_refresh_with_revoked_token(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    raw = await _insert_refresh_token(db_session, test_user, revoked=True)
    client.cookies.set("aivora_refresh", raw)
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    client.cookies.clear()


@pytest.mark.asyncio
async def test_refresh_with_expired_token(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    raw = await _insert_refresh_token(db_session, test_user, expired=True)
    client.cookies.set("aivora_refresh", raw)
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    client.cookies.clear()


@pytest.mark.asyncio
async def test_refresh_without_cookie(client: AsyncClient):
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
