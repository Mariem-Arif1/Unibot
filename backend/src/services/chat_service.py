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
from src.models.agent import Agent
from src.models.audit_log import AuditLog
from src.models.chat_session import ChatSession
from src.models.organization import Organization
from src.models.user import User
from src.providers.base import LLMProviderConfig
from src.providers.provider_factory import get_provider
from src.services.message_service import MessageService
from src.tools.registry import AGENT_TOOLS

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


def _build_payload(history: list, agent: Agent) -> list[dict]:
    """Inject system prompt (with reasoning protocol) and truncate history to fit context_window_tokens."""
    effective_system_prompt = agent.system_prompt + _REASONING_SUFFIX
    budget = agent.context_window_tokens - len(effective_system_prompt) // _CHARS_PER_TOKEN

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

    async def _generate_title(
        self,
        user_msg: str,
        assistant_msg: str,
        agent: Agent,
        api_key: str,
        effective_provider: str,
        effective_model: str,
    ) -> str | None:
        """Generate a short title using the currently active provider/model."""
        try:
            config = LLMProviderConfig(
                provider=effective_provider,
                model=effective_model,
                api_key=api_key,
                system_prompt=_TITLE_SYSTEM_PROMPT,
                temperature=0.3,
                max_tokens=_TITLE_MAX_TOKENS,
                context_window_tokens=agent.context_window_tokens,
            )
            provider = get_provider(effective_provider)
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
        provider_override: str | None = None,
        model_override: str | None = None,
    ) -> AsyncIterator[str]:
        # Load agent
        result = await db.execute(select(Agent).where(Agent.id == session.agent_id))
        agent = result.scalar_one_or_none()
        if agent is None or not agent.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agent is not available.",
            )

        # Require a model override — agents don't own a provider/model
        if not provider_override or not model_override:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="provider and model are required.",
            )
        effective_provider = provider_override
        effective_model = model_override

        # Check API key is configured for the effective provider
        settings = get_settings()
        _key_map = {
            "anthropic": settings.anthropic_api_key,
            "openai": settings.openai_api_key,
            "gemini": settings.gemini_api_key,
        }
        api_key = _key_map.get(effective_provider, "")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Provider '{effective_provider}' API key not configured.",
            )

        # Concurrency guard
        lock = await _get_or_create_lock(session.id)
        if lock.locked():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A response is already being generated for this session.",
            )

        # Resolve BC org context for this user (company name + optional per-org DSN)
        tool_context = await self._resolve_tool_context(user_id, db)

        return self._stream_generator(
            session, user_id, content, agent, api_key, db, lock,
            effective_provider=effective_provider,
            effective_model=effective_model,
            tool_context=tool_context,
        )

    async def _resolve_tool_context(self, user_id: str, db: AsyncSession) -> dict:
        """Return BC connection context from the user's organization.

        Keys: ``bc_company_name``, ``bc_database_url``.
        Returns an empty dict if the user has no org — executors will fall back
        to the global BC_* env vars via get_settings().
        """
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is None or user.organization_id is None:
            return {}

        org_result = await db.execute(
            select(Organization).where(
                Organization.id == user.organization_id,
                Organization.is_active == True,  # noqa: E712
            )
        )
        org = org_result.scalar_one_or_none()
        if org is None:
            return {}

        return {
            "bc_company_name": org.bc_company_name,
            "bc_database_url": org.bc_database_url or "",
        }

    async def _stream_generator(
        self,
        session: ChatSession,
        user_id: str,
        content: str,
        agent: Agent,
        api_key: str,
        db: AsyncSession,
        lock: asyncio.Lock,
        effective_provider: str,
        effective_model: str,
        tool_context: dict | None = None,
    ) -> AsyncIterator[str]:
        async with lock:
            # Persist user message
            await self._message_svc.add_message(session.id, "user", content, db)

            # Load history for context
            from src.services.message_service import _MAX_PAGE_SIZE
            msgs, _ = await self._message_svc.list_messages(session.id, 1, _MAX_PAGE_SIZE, db)
            payload = _build_payload(msgs, agent)

            config = LLMProviderConfig(
                provider=effective_provider,
                model=effective_model,
                api_key=api_key,
                system_prompt=agent.system_prompt + _REASONING_SUFFIX,
                temperature=agent.temperature,
                max_tokens=agent.max_tokens,
                context_window_tokens=agent.context_window_tokens,
            )

            provider = get_provider(effective_provider)
            assembled: list[str] = []

            # Determine whether this agent has tools and whether the provider supports them
            toolset = AGENT_TOOLS.get(agent.agent_type) if agent.agent_type else None
            use_tools = toolset is not None and hasattr(provider, "stream_with_tools")
            if toolset and not use_tools:
                logger.warning(
                    "agent_type=%s requested tools but provider=%s does not support "
                    "stream_with_tools — falling back to plain stream",
                    agent.agent_type,
                    effective_provider,
                )

            try:
                if use_tools:
                    async for item in provider.stream_with_tools(payload, config, toolset, tool_context or {}):
                        if isinstance(item, str):
                            assembled.append(item)
                            yield f"event: token\ndata: {json.dumps({'token': item})}\n\n"
                        else:
                            yield f"event: {item['event']}\ndata: {json.dumps(item['data'])}\n\n"
                else:
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
                    detail=f"agent_id={agent.id} provider={effective_provider} model={effective_model}",
                )
                db.add(audit)
                await db.commit()

                yield f"event: done\ndata: {json.dumps({'id': msg.id, 'session_id': session.id, 'role': 'assistant', 'content': full_response, 'created_at': msg.created_at.isoformat()})}\n\n"
                logger.info("llm.stream.complete session_id=%s provider=%s", session.id, effective_provider)

                # Auto-name and auto-save on every exchange until the session is saved
                sess_result = await db.execute(select(ChatSession).where(ChatSession.id == session.id))
                current_session = sess_result.scalar_one_or_none()
                if current_session and not current_session.is_saved:
                    title = await self._generate_title(
                        content, full_response, agent, api_key,
                        effective_provider, effective_model,
                    )
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
