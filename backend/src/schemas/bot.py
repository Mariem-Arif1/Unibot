from pydantic import BaseModel


class BotOut(BaseModel):
    id: str
    name: str
    description: str | None
    provider: str
    model: str
    is_active: bool
    agent_type: str | None = None

    model_config = {"from_attributes": True}


class BotListOut(BaseModel):
    items: list[BotOut]
