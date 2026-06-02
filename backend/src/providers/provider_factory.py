from fastapi import HTTPException, status

from src.providers.base import LLMProvider
from src.providers.anthropic_provider import AnthropicProvider
from src.providers.openai_provider import OpenAIProvider
from src.providers.gemini_provider import GeminiProvider

_REGISTRY: dict[str, LLMProvider] = {
    "anthropic": AnthropicProvider(),
    "openai": OpenAIProvider(),
    "gemini": GeminiProvider(),
}


def get_provider(provider_name: str) -> LLMProvider:
    provider = _REGISTRY.get(provider_name)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unsupported LLM provider: {provider_name}",
        )
    return provider
