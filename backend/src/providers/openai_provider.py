import logging
from typing import AsyncIterator

import openai as openai_lib

from src.providers.base import LLMProviderConfig

logger = logging.getLogger(__name__)


class OpenAIProvider:
    async def stream(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
    ) -> AsyncIterator[str]:
        client = openai_lib.AsyncOpenAI(api_key=config.api_key)

        try:
            stream = await client.chat.completions.create(
                model=config.model,
                messages=messages,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except openai_lib.OpenAIError as e:
            logger.error("openai.stream.error: %s", e)
            raise
