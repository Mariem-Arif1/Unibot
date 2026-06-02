from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import CurrentUser, get_current_user
from src.models.bot import Bot
from src.schemas.bot import BotListOut, BotOut

router = APIRouter()


@router.get("", response_model=BotListOut)
async def list_bots(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    # v1: list all active bots — bot-user assignment handled in F2
    result = await db.execute(select(Bot).where(Bot.is_active == True))  # noqa: E712
    bots = result.scalars().all()
    return BotListOut(items=[BotOut.model_validate(b) for b in bots])


@router.get("/{bot_id}", response_model=BotOut)
async def get_bot(
    bot_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Bot).where(Bot.id == bot_id, Bot.is_active == True)  # noqa: E712
    )
    bot = result.scalar_one_or_none()
    if bot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return BotOut.model_validate(bot)
