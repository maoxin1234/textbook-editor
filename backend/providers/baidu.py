"""
百度文心一言适配器
认证流程：用 client_id + client_secret 换取 access_token，再调用对话接口。
"""
import json
from typing import AsyncIterator
import httpx
from .base import BaseProvider

_TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
_CHAT_BASE = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{}"

# 模型名 -> 接口路径段（百度千帆平台路由）
_MODEL_ENDPOINT: dict[str, str] = {
    # ERNIE 5.0
    "ernie-5.0-8k": "ernie-5.0-8k",
    # ERNIE X1 推理
    "ernie-x1-turbo-32k": "ernie-x1-turbo-32k",
    # ERNIE 4.5
    "ernie-4.5-turbo-128k": "ernie-4.5-turbo-128k",
    "ernie-4.5-8k": "ernie-4.5-8k",
    # ERNIE 4.0
    "ernie-4.0-turbo-8k": "ernie-4.0-turbo-8k",
    "ernie-4.0-8k": "completions_pro",
    # ERNIE Lite
    "ernie-lite-8k": "ernie-lite-8k",
    "ernie-speed-8k": "ernie_speed",
    "ernie-3.5-8k": "completions",
}


class BaiduProvider(BaseProvider):
    def __init__(self, api_key: str, secret_key: str):
        # api_key = client_id, secret_key = client_secret
        self.api_key = api_key
        self.secret_key = secret_key
        self._access_token: str | None = None

    async def _get_token(self) -> str:
        if self._access_token:
            return self._access_token
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                _TOKEN_URL,
                params={
                    "grant_type": "client_credentials",
                    "client_id": self.api_key,
                    "client_secret": self.secret_key,
                },
                timeout=15,
            )
            data = resp.json()
        self._access_token = data["access_token"]
        return self._access_token

    def _build_payload(self, messages: list[dict], stream: bool) -> tuple[str, dict]:
        system = None
        chat_messages: list[dict] = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                chat_messages.append({"role": msg["role"], "content": msg["content"]})
        payload: dict = {"messages": chat_messages, "stream": stream}
        if system:
            payload["system"] = system
        return payload

    async def chat_stream(
        self, messages: list[dict], model: str, **kwargs
    ) -> AsyncIterator[str]:
        token = await self._get_token()
        endpoint = _MODEL_ENDPOINT.get(model, model)
        url = _CHAT_BASE.format(endpoint)
        payload = self._build_payload(messages, stream=True)

        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST", url, params={"access_token": token}, json=payload
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        raw = line[5:].strip()
                        if raw and raw != "[DONE]":
                            data = json.loads(raw)
                            if result := data.get("result"):
                                yield result

    async def chat(self, messages: list[dict], model: str, **kwargs) -> str:
        result = ""
        async for chunk in self.chat_stream(messages, model, **kwargs):
            result += chunk
        return result
