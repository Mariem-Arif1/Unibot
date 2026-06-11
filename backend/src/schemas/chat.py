from pydantic import BaseModel, field_validator


class ChatRequest(BaseModel):
    content: str
    provider: str | None = None  # optional model override (e.g. "openai", "anthropic")
    model: str | None = None     # optional model override (e.g. "gpt-4o", "claude-sonnet-4-6")

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content cannot be empty")
        return v
