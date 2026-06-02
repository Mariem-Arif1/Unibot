import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.models.audit_log import AuditLog
from src.models.bot import Bot
from src.models.chat_session import ChatSession
from src.providers.base import LLMProviderConfig
from src.providers.provider_factory import get_provider
from src.services.message_service import MessageService

_TITLE_SYSTEM_PROMPT = (
    "You decide whether a conversation is worth saving, then title it.\n"
    "Rules:\n"
    "- If the user is just greeting (hi, hello, thanks, bye, etc.) or the exchange has no real substance, reply with exactly: SKIP\n"
    "- If the user asks a real question, raises a problem, or requests something meaningful, reply with a title of 4-7 words that captures the topic. No quotes, no punctuation at the end.\n"
    "Reply with ONLY the title or SKIP — nothing else."
)
_TITLE_MAX_TOKENS = 20

logger = logging.getLogger(__name__)

# Per-session concurrency locks: session_id → asyncio.Lock
_session_locks: dict[str, asyncio.Lock] = {}
_locks_mutex = asyncio.Lock()

_CHARS_PER_TOKEN = 4  # conservative approximation

_REASONING_SUFFIX = """

---
## Response protocol

SKIP everything below for simple conversational messages (greetings, thanks, one-word replies, small talk) — just reply naturally.

For any substantive request (question, task, explanation, analysis, code, research, comparison, etc.) open your reply with a process block using this JSONL format — one JSON object per line, nothing else inside the fence:

```process
{"type":"title","text":"<brief phrase describing the task>"}
{"type":"thinking","text":"<your analysis and plan as one or two sentences>"}
{"type":"search","query":"<topic you are examining>","results":[{"title":"<relevant item>","source":"<domain or concept>"}],"count":<integer>}
{"type":"thinking","text":"<what you concluded and how you will answer>"}
{"type":"done","label":"Terminé"}
```

Rules:
- One JSON object per line — no arrays, no nesting across lines
- Always: title → thinking → 1-2 search steps → thinking → done  (4-6 lines total)
- After the closing ``` write your full answer immediately, no blank prefix line

Example:
```process
{"type":"title","text":"Explain Python async/await"}
{"type":"thinking","text":"The user wants to understand async/await. I will cover the event loop, coroutines, and a practical example."}
{"type":"search","query":"Python asyncio event loop","results":[{"title":"asyncio — Asynchronous I/O","source":"docs.python.org"},{"title":"Understanding the event loop","source":"realpython.com"},{"title":"Coroutines and Tasks","source":"docs.python.org"}],"count":3}
{"type":"thinking","text":"I have enough context to give a clear explanation with a code example."}
{"type":"done","label":"Terminé"}
```

Async/await allows you to write concurrent code..."""


async def _get_or_create_lock(session_id: str) -> asyncio.Lock:
    async with _locks_mutex:
        if session_id not in _session_locks:
            _session_locks[session_id] = asyncio.Lock()
        return _session_locks[session_id]


def _build_payload(history: list, bot: Bot) -> list[dict]:
    """Inject system prompt (with reasoning protocol) and truncate history to fit context_window_tokens."""
    effective_system_prompt = bot.system_prompt + _REASONING_SUFFIX
    budget = bot.context_window_tokens - len(effective_system_prompt) // _CHARS_PER_TOKEN

    # Build from newest to oldest, then reverse
    selected = []
    used = 0
    for msg in reversed(history):
        tokens = len(msg.content) // _CHARS_PER_TOKEN
        if used + tokens > budget:
            break
        selected.append({"role": msg.role, "content": msg.content})
        used += tokens

    selected.reverse()

    # Prepend system prompt (for OpenAI-style; Anthropic handles it separately)
    return [{"role": "system", "content": effective_system_prompt}] + selected


class ChatService:
    def __init__(self):
        self._message_svc = MessageService()

    async def _generate_title(self, user_msg: str, assistant_msg: str, bot: Bot, api_key: str) -> str | None:
        """Generate a short title for a conversation using the bot's LLM provider."""
        try:
            config = LLMProviderConfig(
                provider=bot.provider,
                model=bot.model,
                api_key=api_key,
                system_prompt=_TITLE_SYSTEM_PROMPT,
                temperature=0.3,
                max_tokens=_TITLE_MAX_TOKENS,
                context_window_tokens=bot.context_window_tokens,
            )
            provider = get_provider(bot.provider)
            payload = [
                {"role": "system", "content": _TITLE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Generate a title for this conversation:\n"
                        f"User: {user_msg[:300]}\n"
                        f"Assistant: {assistant_msg[:300]}"
                    ),
                },
            ]
            tokens: list[str] = []
            async for token in provider.stream(payload, config):
                tokens.append(token)
            title = "".join(tokens).strip().strip('"').strip("'")
            return title if title else None
        except Exception as e:
            logger.warning("title_generation.failed error=%s", e)
            return None

    async def stream_response(
        self,
        session: ChatSession,
        user_id: str,
        content: str,
        db: AsyncSession,
    ) -> AsyncIterator[str]:
        # Load bot
        result = await db.execute(select(Bot).where(Bot.id == session.bot_id))
        bot = result.scalar_one_or_none()
        if bot is None or not bot.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bot is not available.",
            )

        # Check API key is configured
        settings = get_settings()
        _key_map = {
            "anthropic": settings.anthropic_api_key,
            "openai": settings.openai_api_key,
            "gemini": settings.gemini_api_key,
        }
        api_key = _key_map.get(bot.provider, "")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Provider '{bot.provider}' API key not configured.",
            )

        # Concurrency guard
        lock = await _get_or_create_lock(session.id)
        if lock.locked():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A response is already being generated for this session.",
            )

        return self._stream_generator(session, user_id, content, bot, api_key, db, lock)

    async def _stream_generator(
        self,
        session: ChatSession,
        user_id: str,
        content: str,
        bot: Bot,
        api_key: str,
        db: AsyncSession,
        lock: asyncio.Lock,
    ) -> AsyncIterator[str]:
        async with lock:
            # Persist user message
            await self._message_svc.add_message(session.id, "user", content, db)

            # Load history for context
            from src.services.message_service import _MAX_PAGE_SIZE
            msgs, _ = await self._message_svc.list_messages(session.id, 1, _MAX_PAGE_SIZE, db)
            payload = _build_payload(msgs, bot)

            config = LLMProviderConfig(
                provider=bot.provider,
                model=bot.model,
                api_key=api_key,
                system_prompt=bot.system_prompt + _REASONING_SUFFIX,
                temperature=bot.temperature,
                max_tokens=bot.max_tokens,
                context_window_tokens=bot.context_window_tokens,
            )

            provider = get_provider(bot.provider)
            assembled: list[str] = []

            try:
                async for token in provider.stream(payload, config):
                    assembled.append(token)
                    yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

                # Persist complete assistant message
                full_response = "".join(assembled)
                msg = await self._message_svc.add_message(session.id, "assistant", full_response, db)

                # Audit log
                audit = AuditLog(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    action="llm.invoked",
                    entity_type="chat_session",
                    entity_id=session.id,
                    detail=f"bot_id={bot.id} provider={bot.provider}",
                )
                db.add(audit)
                await db.commit()

                yield f"event: done\ndata: {json.dumps({'id': msg.id, 'session_id': session.id, 'role': 'assistant', 'content': full_response, 'created_at': msg.created_at.isoformat()})}\n\n"
                logger.info("llm.stream.complete session_id=%s provider=%s", session.id, bot.provider)

                # Auto-name and auto-save after the very first exchange if substantive
                _, total_msgs = await self._message_svc.list_messages(session.id, 1, 2, db)
                if total_msgs == 2:
                    title = await self._generate_title(content, full_response, bot, api_key)
                    if title and title.upper() != "SKIP":
                        now = datetime.now(timezone.utc)
                        await db.execute(
                            update(ChatSession)
                            .where(ChatSession.id == session.id)
                            .values(name=title, is_saved=True, updated_at=now)
                        )
                        await db.commit()
                        yield f"event: session_name\ndata: {json.dumps({'session_id': session.id, 'name': title, 'is_saved': True})}\n\n"
                        logger.info("session.auto_saved session_id=%s name=%s", session.id, title)

            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                print(f"\n\n===STREAM ERROR===\n{tb}\n==================\n", flush=True)
                logger.error("llm.stream.error session_id=%s error=%s\n%s", session.id, e, tb)
                yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
