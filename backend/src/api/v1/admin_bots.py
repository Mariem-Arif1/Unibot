from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import require_role
from src.models.agent import Agent
from src.models.user import UserRole
from src.schemas.bot import BotAdminOut, BotCreate, BotUpdate

router = APIRouter()

AdminUser = Depends(require_role(UserRole.admin))


@router.get("", response_model=list[BotAdminOut])
async def list_all_bots(
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
    bots = result.scalars().all()
    return [BotAdminOut.model_validate(b) for b in bots]


@router.post("", response_model=BotAdminOut, status_code=status.HTTP_201_CREATED)
async def create_bot(
    payload: BotCreate,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    bot = Agent(**payload.model_dump())
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return BotAdminOut.model_validate(bot)


@router.get("/{bot_id}", response_model=BotAdminOut)
async def get_bot(
    bot_id: str,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Agent).where(Agent.id == bot_id))
    bot = result.scalar_one_or_none()
    if bot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    return BotAdminOut.model_validate(bot)


@router.put("/{bot_id}", response_model=BotAdminOut)
async def update_bot(
    bot_id: str,
    payload: BotUpdate,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Agent).where(Agent.id == bot_id))
    bot = result.scalar_one_or_none()
    if bot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(bot, field, value)
    await db.commit()
    await db.refresh(bot)
    return BotAdminOut.model_validate(bot)


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(
    bot_id: str,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Agent).where(Agent.id == bot_id))
    bot = result.scalar_one_or_none()
    if bot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")
    await db.delete(bot)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
