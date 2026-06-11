from datetime import datetime

from pydantic import BaseModel, field_validator


# Admin schemas for managing Bots (business personas stored in the `agents` table)

class BotCreate(BaseModel):
    name: str
    description: str | None = None
    system_prompt: str = "You are a helpful assistant."
    agent_type: str | None = None
    is_active: bool = True

    # LLM parameters — used as defaults when no LLMConfig overrides them
    temperature: float = 0.7
    max_tokens: int = 1024
    context_window_tokens: int = 4000


class BotUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    agent_type: str | None = None
    is_active: bool | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    context_window_tokens: int | None = None

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float | None) -> float | None:
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("temperature must be between 0.0 and 1.0")
        return v


class BotAdminOut(BaseModel):
    id: str
    name: str
    description: str | None
    system_prompt: str
    agent_type: str | None
    temperature: float
    max_tokens: int
    context_window_tokens: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


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
