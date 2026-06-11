import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Bot(Base):
    __tablename__ = "bots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # 'anthropic' | 'openai'
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text(), nullable=False, default="You are a helpful assistant.")
    temperature: Mapped[float] = mapped_column(Float(), nullable=False, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer(), nullable=False, default=1024)
    context_window_tokens: Mapped[int] = mapped_column(Integer(), nullable=False, default=4000)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    agent_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), nullable=False, server_default=text("GETUTCDATE()")
    )
