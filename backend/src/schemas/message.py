from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class MessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content cannot be empty")
        return v


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageListOut(BaseModel):
    items: list[MessageOut]
    total: int
    page: int
    page_size: int
    has_more: bool
