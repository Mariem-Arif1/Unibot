import logging
from typing import AsyncIterator

import anthropic

from src.providers.base import LLMProviderConfig

logger = logging.getLogger(__name__)


class AnthropicProvider:
    async def stream(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
    ) -> AsyncIterator[str]:
        client = anthropic.AsyncAnthropic(api_key=config.api_key)

        # Anthropic separates system prompt from messages
        system = config.system_prompt
        chat_messages = [m for m in messages if m["role"] != "system"]

        try:
            async with client.messages.stream(
                model=config.model,
                max_tokens=config.max_tokens,
                system=system,
                messages=chat_messages,
                temperature=config.temperature,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except anthropic.APIError as e:
            logger.error("anthropic.stream.error: %s", e)
            raise
