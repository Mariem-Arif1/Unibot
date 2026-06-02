from dataclasses import dataclass
from typing import AsyncIterator, Protocol, runtime_checkable


@dataclass
class LLMProviderConfig:
    provider: str
    model: str
    api_key: str
    system_prompt: str
    temperature: float
    max_tokens: int
    context_window_tokens: int


@runtime_checkable
class LLMProvider(Protocol):
    async def stream(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
    ) -> AsyncIterator[str]:
        ...
