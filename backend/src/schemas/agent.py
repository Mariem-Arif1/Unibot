from datetime import datetime

from pydantic import BaseModel


class AgentOut(BaseModel):
    id: str
    name: str
    description: str | None
    agent_type: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentListOut(BaseModel):
    items: list[AgentOut]
