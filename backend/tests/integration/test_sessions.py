"""Integration tests for F3 — Chat Sessions & Persistence."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User


BOT_ID = "00000000-0000-0000-0000-000000000001"


async def _login(client: AsyncClient, email: str, password: str) -> None:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200


# ── US1: Create and Start a Chat Session ──────────────────────────────────────

@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    resp = await client.post("/api/v1/sessions", json={"bot_id": BOT_ID, "name": "My Session"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["bot_id"] == BOT_ID
    assert data["name"] == "My Session"
    assert data["user_id"] == test_user.id
    assert "id" in data


@pytest.mark.asyncio
async def test_create_session_default_name(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    resp = await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})
    assert resp.status_code == 201
    assert resp.json()["name"].startswith("New Chat")


@pytest.mark.asyncio
async def test_add_user_message(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    session_resp = await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})
    session_id = session_resp.json()["id"]

    resp = await client.post(
        f"/api/v1/sessions/{session_id}/messages",
        json={"role": "user", "content": "Hello there"},
    )
    assert resp.status_code == 201
    msg = resp.json()
    assert msg["role"] == "user"
    assert msg["content"] == "Hello there"
    assert msg["session_id"] == session_id


@pytest.mark.asyncio
async def test_add_assistant_message(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    session_resp = await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})
    session_id = session_resp.json()["id"]

    resp = await client.post(
        f"/api/v1/sessions/{session_id}/messages",
        json={"role": "assistant", "content": "Hi, how can I help?"},
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "assistant"


@pytest.mark.asyncio
async def test_session_isolation(client: AsyncClient, test_user: User):
    """Messages in session A must not appear in session B."""
    await _login(client, "test@aivora.local", "TestPass123!")

    s1 = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})).json()["id"]
    s2 = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})).json()["id"]

    await client.post(f"/api/v1/sessions/{s1}/messages", json={"role": "user", "content": "Session A msg"})
    await client.post(f"/api/v1/sessions/{s2}/messages", json={"role": "user", "content": "Session B msg"})

    msgs_s1 = (await client.get(f"/api/v1/sessions/{s1}/messages")).json()["items"]
    msgs_s2 = (await client.get(f"/api/v1/sessions/{s2}/messages")).json()["items"]

    assert len(msgs_s1) == 1
    assert msgs_s1[0]["content"] == "Session A msg"
    assert len(msgs_s2) == 1
    assert msgs_s2[0]["content"] == "Session B msg"


# ── US2: List and Resume Sessions ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_sessions_ordered_by_recency(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    bot_id = "00000000-0000-0000-0000-000000000002"
    s1 = (await client.post("/api/v1/sessions", json={"bot_id": bot_id, "name": "First"})).json()["id"]
    s2 = (await client.post("/api/v1/sessions", json={"bot_id": bot_id, "name": "Second"})).json()["id"]
    # Add a message to s1 to bump its updated_at
    await client.post(f"/api/v1/sessions/{s1}/messages", json={"role": "user", "content": "bump"})

    resp = await client.get(f"/api/v1/sessions?bot_id={bot_id}")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert items[0]["id"] == s1  # most recently updated first


@pytest.mark.asyncio
async def test_get_session(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    created = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID, "name": "Detail Test"})).json()
    resp = await client.get(f"/api/v1/sessions/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Detail Test"


@pytest.mark.asyncio
async def test_list_messages_pagination(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    session_id = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})).json()["id"]
    for i in range(5):
        await client.post(
            f"/api/v1/sessions/{session_id}/messages",
            json={"role": "user", "content": f"message {i}"},
        )

    resp = await client.get(f"/api/v1/sessions/{session_id}/messages?page=1&page_size=3")
    data = resp.json()
    assert len(data["items"]) == 3
    assert data["total"] == 5
    assert data["has_more"] is True

    resp2 = await client.get(f"/api/v1/sessions/{session_id}/messages?page=2&page_size=3")
    data2 = resp2.json()
    assert len(data2["items"]) == 2
    assert data2["has_more"] is False


# ── US3: Rename and Delete Sessions ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_rename_session(client: AsyncClient, test_user: User):
    await _login(client, "test@aivora.local", "TestPass123!")

    session_id = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID, "name": "Old Name"})).json()["id"]
    resp = await client.patch(f"/api/v1/sessions/{session_id}", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"

    detail = (await client.get(f"/api/v1/sessions/{session_id}")).json()
    assert detail["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient, test_user: User, db_session: AsyncSession):
    await _login(client, "test@aivora.local", "TestPass123!")

    session_id = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})).json()["id"]
    await client.post(f"/api/v1/sessions/{session_id}/messages", json={"role": "user", "content": "bye"})

    resp = await client.delete(f"/api/v1/sessions/{session_id}")
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/sessions/{session_id}")
    assert get_resp.status_code == 404

    msgs_resp = await client.get(f"/api/v1/sessions/{session_id}/messages")
    assert msgs_resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_user_access_denied(client: AsyncClient, test_user: User, admin_user: User):
    """User A cannot access User B's session."""
    await _login(client, "test@aivora.local", "TestPass123!")
    session_id = (await client.post("/api/v1/sessions", json={"bot_id": BOT_ID})).json()["id"]

    # Login as admin (different user)
    await _login(client, "admin@aivora.local", "AdminPass123!")
    resp = await client.get(f"/api/v1/sessions/{session_id}")
    assert resp.status_code == 404  # 404 not 403 to avoid leaking existence
