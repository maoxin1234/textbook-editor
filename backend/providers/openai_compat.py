from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider


class OpenAICompatProvider(BaseProvider):
    """
    统一处理所有 OpenAI 兼容接口的模型：
    OpenAI / DeepSeek / 通义千问 / Moonshot / 智谱 / MiniMax 等
    """

    def __init__(self, api_key: str, base_url: str | None = None):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def chat_stream(
        self, messages: list[dict], model: str, **kwargs
    ) -> AsyncIterator[str]:
        stream = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            **kwargs,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def chat(self, messages: list[dict], model: str, **kwargs) -> str:
        resp = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs,
        )
        return resp.choices[0].message.content or ""
