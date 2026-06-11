import json
import logging
from typing import TYPE_CHECKING, AsyncIterator

import openai as openai_lib

from src.providers.base import LLMProviderConfig

if TYPE_CHECKING:
    from src.tools.registry import AgentToolset

logger = logging.getLogger(__name__)

_MAX_TOOL_ROUNDS = 5


def _to_openai_tools(definitions: list[dict]) -> list[dict]:
    """Convert Anthropic-format tool definitions to OpenAI function-calling format."""
    result = []
    for d in definitions:
        result.append({
            "type": "function",
            "function": {
                "name": d["name"],
                "description": d["description"],
                # Anthropic uses "input_schema"; OpenAI uses "parameters" — same JSON Schema
                "parameters": d["input_schema"],
            },
        })
    return result


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

    async def stream_with_tools(
        self,
        messages: list[dict],
        config: LLMProviderConfig,
        toolset: "AgentToolset",
    ) -> AsyncIterator[str | dict]:
        """Agentic loop for OpenAI: execute tool calls then stream final text response.

        Yields str (text tokens) or dict (tool_call / tool_result events).
        """
        client = openai_lib.AsyncOpenAI(api_key=config.api_key)
        openai_tools = _to_openai_tools(toolset.definitions)
        chat_messages = list(messages)  # work on a copy

        for round_num in range(_MAX_TOOL_ROUNDS):
            try:
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=chat_messages,
                    tools=openai_tools,
                    tool_choice="auto",
                    max_tokens=config.max_tokens,
                    temperature=config.temperature,
                )
            except openai_lib.OpenAIError as e:
                logger.error("openai.stream_with_tools.create.error round=%d error=%s", round_num, e)
                raise

            message = response.choices[0].message
            tool_calls = message.tool_calls

            if tool_calls:
                # Append assistant turn with tool_calls
                chat_messages.append({
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in tool_calls
                    ],
                })

                for tc in tool_calls:
                    tool_name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments)
                    except (json.JSONDecodeError, TypeError):
                        args = {}

                    # Emit tool_call event
                    yield {"event": "tool_call", "data": {"tool": tool_name, "args": args}}

                    # Execute tool
                    result_json = await toolset.executor(tool_name, args)

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
                            "tool": tool_name,
                            "row_count": row_count,
                            "success": success,
                        },
                    }
                    if error_msg:
                        result_event["data"]["error"] = error_msg

                    yield result_event

                    # Add tool result to messages
                    chat_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result_json,
                    })

            else:
                # No tool calls — stream final text response
                try:
                    stream = await client.chat.completions.create(
                        model=config.model,
                        messages=chat_messages,
                        max_tokens=config.max_tokens,
                        temperature=config.temperature,
                        stream=True,
                    )
                    async for chunk in stream:
                        if chunk.choices and chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                except openai_lib.OpenAIError as e:
                    logger.error("openai.stream_with_tools.final_stream.error: %s", e)
                    raise
                break

        else:
            logger.warning("openai.stream_with_tools reached max tool rounds (%d)", _MAX_TOOL_ROUNDS)
