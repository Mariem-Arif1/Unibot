from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import get_current_user, CurrentUser
from src.models.agent import Agent
from src.schemas.agent import AgentListOut, AgentOut

router = APIRouter()


@router.get("", response_model=AgentListOut)
async def list_agents(
    _: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Agent).where(Agent.is_active == True).order_by(Agent.name)  # noqa: E712
    )
    agents = list(result.scalars().all())
    return AgentListOut(items=[AgentOut.model_validate(a) for a in agents])


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(
    agent_id: str,
    _: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.is_active == True)  # noqa: E712
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    return AgentOut.model_validate(agent)
