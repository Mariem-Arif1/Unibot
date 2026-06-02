import pytest
from httpx import AsyncClient

from src.models.user import User


@pytest.mark.asyncio
async def test_login_valid_credentials(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "TestPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == test_user.email
    assert data["user"]["role"] == "user"
    assert "hashed_password" not in data["user"]
    assert "aivora_access" in response.cookies
    assert "aivora_refresh" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@aivora.local", "password": "anything"},
    )
    assert response.status_code == 401
    # Must return the SAME message — no user enumeration
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_same_error_message_prevents_enumeration(client: AsyncClient, test_user: User):
    resp_wrong_pw = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "WrongPassword!"},
    )
    resp_unknown = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@aivora.local", "password": "anything"},
    )
    assert resp_wrong_pw.json()["detail"] == resp_unknown.json()["detail"]


@pytest.mark.asyncio
async def test_login_empty_body(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_invalid_email_format(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "pass"},
    )
    assert response.status_code == 422
