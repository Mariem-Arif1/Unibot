import json
import logging
from typing import TYPE_CHECKING, AsyncIterator

import anthropic

from src.providers.base import LLMProviderConfig

if TYPE_CHECKING:
    from src.tools.registry import AgentToolset

logger = logging.getLogger(__name__)

_MAX_TOOL_ROUNDS = 5


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

    async def stream_with_tools(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
        toolset: "AgentToolset",
        tool_context: dict | None = None,
    ) -> AsyncIterator[str | dict]:
        """Agentic loop: call tools non-streaming, then stream the final text response.

        Yields str (text tokens) or dict (tool_call / tool_result events).
        """
        client = anthropic.AsyncAnthropic(api_key=config.api_key)
        system = config.system_prompt
        # Work on a mutable copy so the loop can append tool turns
        chat_messages = [m for m in messages if m["role"] != "system"]

        for round_num in range(_MAX_TOOL_ROUNDS):
            try:
                response = await client.messages.create(
                    model=config.model,
                    max_tokens=config.max_tokens,
                    system=system,
                    messages=chat_messages,
                    tools=toolset.definitions,
                    tool_choice={"type": "auto"},
                    temperature=config.temperature,
                )
            except anthropic.APIError as e:
                logger.error("anthropic.stream_with_tools.create.error round=%d error=%s", round_num, e)
                raise

            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

            if tool_use_blocks:
                # Append assistant turn (may contain both text and tool_use blocks)
                chat_messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in tool_use_blocks:
                    # Emit tool_call event
                    yield {
                        "event": "tool_call",
                        "data": {"tool": block.name, "args": block.input},
                    }

                    # Execute tool (pass org context so executor knows company/DSN)
                    result_json = await toolset.executor(block.name, block.input, tool_context or {})

                    # Calculate row_count for the result event
                    success = True
                    error_msg = None
                    try:
                        parsed = json.loads(result_json)
                        if isinstance(parsed, list):
                            row_count = len(parsed)
                        elif isinstance(parsed, dict) and "error" in parsed:
                            row_count = 0
                            success = False
                            error_msg = parsed["error"]
                        else:
                            row_count = 0
                    except (json.JSONDecodeError, TypeError):
                        row_count = 0

                    result_event: dict = {
                        "event": "tool_result",
                        "data": {
                            "tool": block.name,
                            "row_count": row_count,
                            "success": success,
                        },
                    }
                    if error_msg:
                        result_event["data"]["error"] = error_msg

                    # Emit tool_result event
                    yield result_event

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_json,
                    })

                # Append tool results turn so the LLM can continue
                chat_messages.append({"role": "user", "content": tool_results})
                # Loop back for the next LLM call

            else:
                # No more tool calls — stream the final text response
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
                    logger.error("anthropic.stream_with_tools.final_stream.error: %s", e)
                    raise
                break
        else:
            logger.warning("anthropic.stream_with_tools reached max tool rounds (%d)", _MAX_TOOL_ROUNDS)
