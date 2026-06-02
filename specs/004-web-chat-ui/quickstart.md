# Quickstart: Web Application UI (F7)

**Prerequisites**: F1 (Auth), F3 (Sessions), and F4 (LLM streaming) backend running on `http://localhost:8000`.

---

## 1. Install dependencies

```bash
cd frontend
npm install
```

Key packages added for F7:
- `swr` — data fetching / caching
- `@microsoft/fetch-event-source` — POST SSE for streaming
- `react-markdown` + `remark-gfm` — Markdown rendering
- `tailwindcss` — styling (already configured)
- `@radix-ui/react-dialog` + `vaul` — modals and mobile drawer (via shadcn/ui)

---

## 2. Configure environment

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 3. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## 4. Verify the golden path

### Step 1: Unauthenticated redirect
Visit `http://localhost:3000/bots` → should redirect to `/login`.

### Step 2: Login
Enter valid credentials → redirected to `/bots`.
Verify your assigned bots appear as cards.

### Step 3: Open a bot
Click a bot card → navigates to `/bots/{botId}`.
Session sidebar appears (empty or with prior sessions).

### Step 4: Create a new session
Click "New Chat" in the sidebar.
A new session appears in the list, the chat area clears.

### Step 5: Send a message
Type "Hello" in the input, press Enter.
- Your message appears immediately (optimistic).
- Typing indicator shows.
- Assistant response streams in token by token.
- Input is disabled during streaming.
- Input re-enables after stream completes.

### Step 6: Reload the page
Navigate away and back to the same bot/session.
Session history loads correctly from the server.

---

## 5. Verify responsive layout

Open browser dev tools → toggle to iPhone 14 viewport (390×844).
- Sidebar should be hidden; hamburger button in header visible.
- Tap hamburger → sidebar drawer slides in.
- Tap a session → drawer closes; chat loads.

---

## 6. Test rename/delete

- Hover over a session in the sidebar → three-dot menu appears.
- Click Rename → type a new name → press Enter → name updates immediately.
- Click Delete → confirmation dialog appears → confirm → session disappears.

---

## 7. Test session expiry

1. Shorten `JWT_ACCESS_EXPIRE_MINUTES` to 1 in `.env`.
2. Log in, wait 1 minute.
3. Send a message → refresh interceptor silently calls `/auth/refresh` and retries.
4. If refresh also expires: redirect to `/login`.

---

## 8. Test error handling

Stop the backend server (`Ctrl+C`), send a message:
- User message appears (optimistic).
- Within ~5 seconds: inline error appears in the chat.
- Input re-enables.
- Restart backend: subsequent messages work normally.
