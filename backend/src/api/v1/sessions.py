from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import CurrentUser, get_current_user, get_session_or_404
from src.models.chat_session import ChatSession
from src.schemas.message import MessageCreate, MessageListOut, MessageOut
from src.schemas.session import SessionCreate, SessionListOut, SessionOut, SessionUpdate
from src.services.message_service import MessageService
from src.services.session_service import SessionService

router = APIRouter()
_session_svc = SessionService()
_message_svc = MessageService()


# ── Session endpoints ──────────────────────────────────────────────────────────

@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    session = await _session_svc.create(
        user_id=current_user.id,
        bot_id=body.bot_id,
        name=body.name,
        db=db,
    )
    return SessionOut.model_validate(session)


@router.get("", response_model=SessionListOut)
async def list_sessions(
    bot_id: str = Query(..., description="Filter sessions by bot ID"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    sessions, total = await _session_svc.list(
        user_id=current_user.id,
        bot_id=bot_id,
        db=db,
    )
    return SessionListOut(
        items=[SessionOut.model_validate(s) for s in sessions],
        total=total,
    )


@router.get("/{session_id}", response_model=SessionOut)
async def get_session_detail(
    chat_session: ChatSession = Depends(get_session_or_404()),
):
    return SessionOut.model_validate(chat_session)


@router.patch("/{session_id}", response_model=SessionOut)
async def rename_session(
    body: SessionUpdate,
    chat_session: ChatSession = Depends(get_session_or_404()),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    updated = await _session_svc.rename(
        session_id=chat_session.id,
        user_id=current_user.id,
        new_name=body.name,
        db=db,
    )
    return SessionOut.model_validate(updated)


@router.post("/{session_id}/save", response_model=SessionOut)
async def save_session(
    chat_session: ChatSession = Depends(get_session_or_404()),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    updated = await _session_svc.save(
        session_id=chat_session.id,
        user_id=current_user.id,
        db=db,
    )
    return SessionOut.model_validate(updated)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    chat_session: ChatSession = Depends(get_session_or_404()),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await _session_svc.delete(
        session_id=chat_session.id,
        user_id=current_user.id,
        db=db,
    )


# ── Message endpoints ──────────────────────────────────────────────────────────

@router.get("/{session_id}/messages", response_model=MessageListOut)
async def list_messages(
    chat_session: ChatSession = Depends(get_session_or_404()),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
):
    messages, total = await _message_svc.list_messages(
        session_id=chat_session.id,
        page=page,
        page_size=page_size,
        db=db,
    )
    return MessageListOut(
        items=[MessageOut.model_validate(m) for m in messages],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("/{session_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def add_message(
    body: MessageCreate,
    chat_session: ChatSession = Depends(get_session_or_404()),
    db: AsyncSession = Depends(get_session),
):
    message = await _message_svc.add_message(
        session_id=chat_session.id,
        role=body.role,
        content=body.content,
        db=db,
    )
    return MessageOut.model_validate(message)
