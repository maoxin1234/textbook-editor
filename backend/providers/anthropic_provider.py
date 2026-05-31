from typing import AsyncIterator
import anthropic
from .base import BaseProvider


class AnthropicProvider(BaseProvider):
    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    def _split_messages(self, messages: list[dict]) -> tuple[str, list[dict]]:
        system = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                chat_messages.append(msg)
        return system, chat_messages

    async def chat_stream(
        self, messages: list[dict], model: str, **kwargs
    ) -> AsyncIterator[str]:
        system, chat_messages = self._split_messages(messages)
        async with self.client.messages.stream(
            model=model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system,
            messages=chat_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def chat(self, messages: list[dict], model: str, **kwargs) -> str:
        system, chat_messages = self._split_messages(messages)
        resp = await self.client.messages.create(
            model=model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system,
            messages=chat_messages,
        )
        return resp.content[0].text
