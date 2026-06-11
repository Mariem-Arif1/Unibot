from datetime import datetime

from pydantic import BaseModel, field_validator

VALID_PROVIDERS = ("anthropic", "openai", "gemini")


class LLMConfigCreate(BaseModel):
    name: str
    description: str | None = None
    provider: str
    model: str
    api_key: str | None = None
    max_tokens: int = 1024
    context_window_tokens: int = 4000
    temperature: float = 0.7
    is_active: bool = True
    bot_id: str | None = None  # FK to agents.id

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in VALID_PROVIDERS:
            raise ValueError(f"provider must be one of {VALID_PROVIDERS}")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("temperature must be between 0.0 and 1.0")
        return v


class LLMConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    provider: str | None = None
    model: str | None = None
    api_key: str | None = None
    max_tokens: int | None = None
    context_window_tokens: int | None = None
    temperature: float | None = None
    is_active: bool | None = None
    bot_id: str | None = None

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_PROVIDERS:
            raise ValueError(f"provider must be one of {VALID_PROVIDERS}")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float | None) -> float | None:
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("temperature must be between 0.0 and 1.0")
        return v


class LLMConfigAdminOut(BaseModel):
    id: str
    name: str
    description: str | None
    provider: str
    model: str
    api_key_masked: str | None  # last 4 chars only, populated in the router
    max_tokens: int
    context_window_tokens: int
    temperature: float
    is_active: bool
    bot_id: str | None
    bot_name: str | None  # joined from agents.name
    created_at: datetime

    model_config = {"from_attributes": False}
