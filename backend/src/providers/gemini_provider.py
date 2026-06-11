from typing import AsyncIterator
import google.generativeai as genai

from src.providers.base import LLMProvider, LLMProviderConfig


class GeminiProvider:
    """Google Gemini streaming provider."""

    async def stream(
        self, messages: list[dict], config: LLMProviderConfig
    ) -> AsyncIterator[str]:
        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(
            model_name=config.model,
            system_instruction=config.system_prompt or None,
            generation_config=genai.types.GenerationConfig(
                temperature=config.temperature,
                max_output_tokens=config.max_tokens,
            ),
        )

        # Convert messages to Gemini format
        history = []
        last_user_msg = ""
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            if msg == messages[-1] and role == "user":
                last_user_msg = msg["content"]
            else:
                history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history)
        response = await chat.send_message_async(last_user_msg, stream=True)
        async for chunk in response:
            if chunk.text:
                yield chunk.text

