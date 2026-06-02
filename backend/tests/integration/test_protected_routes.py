import pytest
from httpx import AsyncClient

from src.models.user import User
from src.core.security import create_access_token


@pytest.mark.asyncio
async def test_get_me_with_valid_token(client: AsyncClient, test_user: User):
    token = create_access_token({
        "sub": str(test_user.id),
        "email": test_user.email,
        "display_name": test_user.display_name,
        "role": test_user.role.value,
    })
    client.cookies.set("aivora_access", token)
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert "hashed_password" not in data
    client.cookies.clear()


@pytest.mark.asyncio
async def test_get_me_without_token(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_get_me_malformed_token(client: AsyncClient):
    client.cookies.set("aivora_access", "this.is.not.a.jwt")
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    client.cookies.clear()
