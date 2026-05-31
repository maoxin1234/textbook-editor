from abc import ABC, abstractmethod
from typing import AsyncIterator


class BaseProvider(ABC):
    @abstractmethod
    async def chat_stream(
        self,
        messages: list[dict],
        model: str,
        **kwargs,
    ) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        model: str,
        **kwargs,
    ) -> str:
        pass
