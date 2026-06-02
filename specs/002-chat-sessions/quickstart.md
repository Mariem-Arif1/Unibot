# Quickstart: Chat Sessions & Persistence (F3)

**Prerequisites**: F1 (Auth) implemented and running. A user account exists (use `seed_user.py`).

---

## 1. Apply the migration

```bash
cd backend
C:\Users\MARIF\AppData\Roaming\Python\Python313\Scripts\alembic.exe upgrade head
```

Expected output: `Running upgrade <prev> -> 002, create chat_sessions messages audit`

---

## 2. Authenticate and get a cookie

```python
# test_f3.py — run with: python test_f3.py
import urllib.request, urllib.parse, json, http.cookiejar

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

# Login
body = json.dumps({"email": "admin@aivora.local", "password": "your_password"}).encode()
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login",
                             data=body, headers={"Content-Type": "application/json"})
res = opener.open(req)
print("Login:", json.loads(res.read()))
```

---

## 3. Create a session

```python
bot_id = "00000000-0000-0000-0000-000000000001"  # stub bot_id for testing

body = json.dumps({"bot_id": bot_id, "name": "Test Session 1"}).encode()
req = urllib.request.Request("http://localhost:8000/api/v1/sessions",
                             data=body, headers={"Content-Type": "application/json"})
res = opener.open(req)
session = json.loads(res.read())
print("Session created:", session)
session_id = session["id"]
```

Expected:
```json
{
  "id": "...",
  "user_id": "...",
  "bot_id": "00000000-0000-0000-0000-000000000001",
  "name": "Test Session 1",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 4. Add a user message

```python
body = json.dumps({"role": "user", "content": "Hello, what can you do?"}).encode()
req = urllib.request.Request(
    f"http://localhost:8000/api/v1/sessions/{session_id}/messages",
    data=body, headers={"Content-Type": "application/json"})
res = opener.open(req)
print("Message stored:", json.loads(res.read()))
```

---

## 5. List sessions for the bot

```python
req = urllib.request.Request(
    f"http://localhost:8000/api/v1/sessions?bot_id={bot_id}")
res = opener.open(req)
sessions = json.loads(res.read())
print("Sessions:", sessions)
# Should show 1 session, updated_at reflects last message
```

---

## 6. Load message history (paginated)

```python
req = urllib.request.Request(
    f"http://localhost:8000/api/v1/sessions/{session_id}/messages?page=1&page_size=50")
res = opener.open(req)
history = json.loads(res.read())
print("History:", history)
# items[0].role == "user", items[0].content == "Hello, what can you do?"
```

---

## 7. Rename the session

```python
import urllib.request as urlreq
body = json.dumps({"name": "Renamed Session"}).encode()
req = urlreq.Request(
    f"http://localhost:8000/api/v1/sessions/{session_id}",
    data=body, headers={"Content-Type": "application/json"}, method="PATCH")
res = opener.open(req)
print("Renamed:", json.loads(res.read()))
```

---

## 8. Delete the session

```python
req = urlreq.Request(
    f"http://localhost:8000/api/v1/sessions/{session_id}", method="DELETE")
res = opener.open(req)
print("Deleted, status:", res.status)  # 204

# Verify it's gone
req = urlreq.Request(f"http://localhost:8000/api/v1/sessions/{session_id}")
try:
    opener.open(req)
except urllib.error.HTTPError as e:
    print("404 confirmed:", e.code)
```

---

## Session Isolation Test

```python
# Create a second user (via seed_user.py), login as user2, try to access session_id from user1
# Expected: 404 (not a 403 to avoid leaking existence)
```

---

## Audit Log Check (DB)

After create and delete operations, query the `audit_logs` table:

```sql
SELECT action, entity_type, entity_id, created_at
FROM audit_logs
WHERE entity_type = 'chat_session'
ORDER BY created_at DESC;
```

Expected rows: `session.created` and `session.deleted` for the session above.
