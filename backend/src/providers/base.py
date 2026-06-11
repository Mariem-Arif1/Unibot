from dataclasses import dataclass
from typing import TYPE_CHECKING, AsyncIterator, Protocol, runtime_checkable

if TYPE_CHECKING:
    from src.tools.registry import AgentToolset


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
    """Base protocol — all providers must implement `stream`.
    Providers that support tool-calling also implement `stream_with_tools`.
    Use `hasattr(provider, "stream_with_tools")` to check capability at runtime.
    """

    async def stream(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
    ) -> AsyncIterator[str]:
        ...
