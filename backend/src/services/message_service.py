import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.chat_message import ChatMessage
from src.models.chat_session import ChatSession

logger = logging.getLogger(__name__)

_MAX_PAGE_SIZE = 200
_DEFAULT_PAGE_SIZE = 50


class MessageService:

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        db: AsyncSession,
    ) -> ChatMessage:
        message = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role=role,
            content=content,
        )
        db.add(message)

        # Update session.updated_at to reflect activity
        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=datetime.now(timezone.utc))
        )

        await db.commit()
        await db.refresh(message)
        logger.debug("message.added session_id=%s role=%s", session_id, role)
        return message

    async def list_messages(
        self,
        session_id: str,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> tuple[list[ChatMessage], int]:
        # Clamp page_size
        page_size = min(page_size, _MAX_PAGE_SIZE)
        page_size = max(page_size, 1)
        page = max(page, 1)
        offset = (page - 1) * page_size

        count_result = await db.execute(
            select(func.count()).select_from(ChatMessage).where(
                ChatMessage.session_id == session_id
            )
        )
        total = count_result.scalar_one()

        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .offset(offset)
            .limit(page_size)
        )
        messages = list(result.scalars().all())
        return messages, total
