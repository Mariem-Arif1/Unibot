from datetime import datetime

from pydantic import BaseModel, field_validator


class SessionCreate(BaseModel):
    bot_id: str
    name: str | None = None

    @field_validator("bot_id")
    @classmethod
    def bot_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("bot_id is required")
        return v.strip()

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 255:
            raise ValueError("name must be 255 characters or fewer")
        return v


class SessionUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        if len(v) > 255:
            raise ValueError("name must be 255 characters or fewer")
        return v


class SessionOut(BaseModel):
    id: str
    user_id: str
    bot_id: str
    name: str
    is_saved: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionListOut(BaseModel):
    items: list[SessionOut]
    total: int
