import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.audit_log import AuditLog
from src.models.chat_session import ChatSession

logger = logging.getLogger(__name__)

_DEFAULT_SESSION_NAME = "New Chat"


def _default_name() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    return f"{_DEFAULT_SESSION_NAME} {ts}"


class SessionService:

    async def create(
        self,
        user_id: str,
        agent_id: str,
        name: str | None,
        db: AsyncSession,
    ) -> ChatSession:
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            agent_id=agent_id,
            name=name.strip() if name else _default_name(),
        )
        db.add(session)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="session.created",
            entity_type="chat_session",
            entity_id=session.id,
            detail=session.name,
        )
        db.add(audit)

        await db.commit()
        await db.refresh(session)
        logger.info("session.created user_id=%s session_id=%s", user_id, session.id)
        return session

    async def list(
        self,
        user_id: str,
        agent_id: str,
        db: AsyncSession,
    ) -> tuple[list[ChatSession], int]:
        count_result = await db.execute(
            select(func.count()).select_from(ChatSession).where(
                ChatSession.user_id == user_id,
                ChatSession.agent_id == agent_id,
                ChatSession.is_saved == True,  # noqa: E712
            )
        )
        total = count_result.scalar_one()

        result = await db.execute(
            select(ChatSession)
            .where(
                ChatSession.user_id == user_id,
                ChatSession.agent_id == agent_id,
                ChatSession.is_saved == True,  # noqa: E712
            )
            .order_by(ChatSession.updated_at.desc())
        )
        sessions = list(result.scalars().all())
        return sessions, total

    async def get(
        self,
        session_id: str,
        user_id: str,
        db: AsyncSession,
    ) -> ChatSession | None:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def rename(
        self,
        session_id: str,
        user_id: str,
        new_name: str,
        db: AsyncSession,
    ) -> ChatSession | None:
        session = await self.get(session_id, user_id, db)
        if session is None:
            return None
        session.name = new_name.strip()
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(session)
        logger.info("session.renamed session_id=%s name=%s", session_id, new_name)
        return session

    async def save(
        self,
        session_id: str,
        user_id: str,
        db: AsyncSession,
    ) -> ChatSession | None:
        session = await self.get(session_id, user_id, db)
        if session is None:
            return None
        session.is_saved = True
        session.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="session.saved",
            entity_type="chat_session",
            entity_id=session_id,
            detail=session.name,
        )
        db.add(audit)

        await db.commit()
        await db.refresh(session)
        logger.info("session.saved session_id=%s", session_id)
        return session

    async def delete(
        self,
        session_id: str,
        user_id: str,
        db: AsyncSession,
    ) -> bool:
        session = await self.get(session_id, user_id, db)
        if session is None:
            return False

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="session.deleted",
            entity_type="chat_session",
            entity_id=session_id,
            detail=session.name,
        )
        db.add(audit)

        await db.delete(session)
        await db.commit()
        logger.info("session.deleted user_id=%s session_id=%s", user_id, session_id)
        return True
