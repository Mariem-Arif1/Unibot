# Quickstart: LLM Provider Adapter (F4)

**Prerequisites**: F1 (Auth) and F3 (Sessions) implemented. A user, a bot, and a session exist.

---

## 1. Set provider API keys in .env

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

---

## 2. Apply the migration

```bash
cd backend
C:\Users\MARIF\AppData\Roaming\Python\Python313\Scripts\alembic.exe upgrade head
```

Expected: migration `003_create_bots_add_bot_fk` runs.

---

## 3. Seed a test bot

```bash
python -m src.scripts.seed_bot --name "Test Bot" --provider anthropic --model claude-3-5-sonnet-20241022
```

Note the bot ID printed to stdout.

---

## 4. Authenticate and create a session

```python
# Full example in specs/002-chat-sessions/quickstart.md steps 2–3
# Use the bot_id from the seed above
```

---

## 5. Stream a response

```python
import urllib.request, urllib.parse, json, http.cookiejar

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

# Login first (see F1 quickstart)
SESSION_ID = "your-session-id"

body = json.dumps({"content": "What is 2 + 2?"}).encode()
req = urllib.request.Request(
    f"http://localhost:8000/api/v1/sessions/{SESSION_ID}/chat",
    data=body, headers={"Content-Type": "application/json"})
req.add_header("Accept", "text/event-stream")

with opener.open(req) as res:
    for line in res:
        line = line.decode("utf-8").strip()
        if line.startswith("data:"):
            data = json.loads(line[5:])
            if "content" in data:
                print(data["content"], end="", flush=True)
        elif line == "event: done":
            print("\n[stream complete]")
            break
        elif line == "event: error":
            print("\n[error]", line)
            break
```

Expected console output:
```
2 + 2 equals 4.
[stream complete]
```

---

## 6. Verify assistant message was persisted

```python
req = urllib.request.Request(
    f"http://localhost:8000/api/v1/sessions/{SESSION_ID}/messages?page=1&page_size=10")
res = opener.open(req)
history = json.loads(res.read())
print("Last message:", history["items"][-1])
# role == "assistant", content contains the response
```

---

## 7. Test 409 Concurrent Guard

```python
import threading

def send_chat():
    body = json.dumps({"content": "Tell me a long story"}).encode()
    req = urllib.request.Request(
        f"http://localhost:8000/api/v1/sessions/{SESSION_ID}/chat",
        data=body, headers={"Content-Type": "application/json"})
    try:
        res = opener.open(req)
        for _ in res:
            pass
    except urllib.error.HTTPError as e:
        print("Status:", e.code)  # Should be 409 for the second concurrent request

t1 = threading.Thread(target=send_chat)
t2 = threading.Thread(target=send_chat)
t1.start(); t2.start()
t1.join(); t2.join()
```

---

## 8. Test provider error handling

Temporarily set a bad API key in `.env`, restart the server, and send a chat request.
Expected: SSE `event: error` event is received; no assistant message in session history.

---

## Test with OpenAI

Change the bot's provider to `openai` and model to `gpt-4o-mini`:

```bash
python -m src.scripts.seed_bot --name "GPT Bot" --provider openai --model gpt-4o-mini
```

Send a chat request to a session using this bot — same SSE format, different provider.
