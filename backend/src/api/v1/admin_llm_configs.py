from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import require_role
from src.models.agent import Agent
from src.models.llm_config import LLMConfig
from src.models.user import UserRole
from src.schemas.llm_config import LLMConfigAdminOut, LLMConfigCreate, LLMConfigUpdate

router = APIRouter()

AdminUser = Depends(require_role(UserRole.admin))


def _to_out(cfg: LLMConfig, bot_name: str | None) -> LLMConfigAdminOut:
    masked = None
    if cfg.api_key:
        masked = "••••" + cfg.api_key[-4:] if len(cfg.api_key) >= 4 else "••••"
    return LLMConfigAdminOut(
        id=cfg.id,
        name=cfg.name,
        description=cfg.description,
        provider=cfg.provider,
        model=cfg.model,
        api_key_masked=masked,
        max_tokens=cfg.max_tokens,
        context_window_tokens=cfg.context_window_tokens,
        temperature=cfg.temperature,
        is_active=cfg.is_active,
        bot_id=cfg.bot_id,
        bot_name=bot_name,
        created_at=cfg.created_at,
    )


@router.get("", response_model=list[LLMConfigAdminOut])
async def list_all_configs(
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(LLMConfig).order_by(LLMConfig.created_at.desc()))
    configs = result.scalars().all()

    # Fetch bot names in one extra query
    bot_ids = {c.bot_id for c in configs if c.bot_id}
    bot_name_map: dict[str, str] = {}
    if bot_ids:
        bots = (await db.execute(select(Agent).where(Agent.id.in_(bot_ids)))).scalars().all()
        bot_name_map = {b.id: b.name for b in bots}

    return [_to_out(c, bot_name_map.get(c.bot_id) if c.bot_id else None) for c in configs]


@router.post("", response_model=LLMConfigAdminOut, status_code=status.HTTP_201_CREATED)
async def create_config(
    payload: LLMConfigCreate,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    if payload.bot_id:
        bot = (await db.execute(select(Agent).where(Agent.id == payload.bot_id))).scalar_one_or_none()
        if bot is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")

    cfg = LLMConfig(**payload.model_dump())
    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)

    bot_name = None
    if cfg.bot_id:
        bot = (await db.execute(select(Agent).where(Agent.id == cfg.bot_id))).scalar_one_or_none()
        bot_name = bot.name if bot else None

    return _to_out(cfg, bot_name)


@router.get("/{config_id}", response_model=LLMConfigAdminOut)
async def get_config(
    config_id: str,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    cfg = (await db.execute(select(LLMConfig).where(LLMConfig.id == config_id))).scalar_one_or_none()
    if cfg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LLM config not found")

    bot_name = None
    if cfg.bot_id:
        bot = (await db.execute(select(Agent).where(Agent.id == cfg.bot_id))).scalar_one_or_none()
        bot_name = bot.name if bot else None

    return _to_out(cfg, bot_name)


@router.put("/{config_id}", response_model=LLMConfigAdminOut)
async def update_config(
    config_id: str,
    payload: LLMConfigUpdate,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    cfg = (await db.execute(select(LLMConfig).where(LLMConfig.id == config_id))).scalar_one_or_none()
    if cfg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LLM config not found")

    updates = payload.model_dump(exclude_unset=True)

    if "bot_id" in updates and updates["bot_id"] is not None:
        bot = (await db.execute(select(Agent).where(Agent.id == updates["bot_id"]))).scalar_one_or_none()
        if bot is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot not found")

    for field, value in updates.items():
        setattr(cfg, field, value)

    await db.commit()
    await db.refresh(cfg)

    bot_name = None
    if cfg.bot_id:
        bot = (await db.execute(select(Agent).where(Agent.id == cfg.bot_id))).scalar_one_or_none()
        bot_name = bot.name if bot else None

    return _to_out(cfg, bot_name)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    config_id: str,
    _=AdminUser,
    db: AsyncSession = Depends(get_session),
):
    cfg = (await db.execute(select(LLMConfig).where(LLMConfig.id == config_id))).scalar_one_or_none()
    if cfg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LLM config not found")
    await db.delete(cfg)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
