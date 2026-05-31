"""
模型提供商注册表 & 工厂函数
所有国产 / 国际模型的接入配置集中在此处，新增模型只需在 PROVIDER_CONFIG 加一条。
"""
from .openai_compat import OpenAICompatProvider
from .anthropic_provider import AnthropicProvider
from .baidu import BaiduProvider
from .base import BaseProvider

PROVIDER_CONFIG: dict[str, dict] = {
    "openai": {
        "name": "OpenAI",
        "base_url": None,
        # 主力：GPT-4.1 系列（2025-04 发布，1M 上下文，低延迟）
        # o 系列：推理模型，适合复杂逻辑
        "models": [
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-4.1-nano",
            "o4-mini",
            "o3",
            "gpt-4o",
            "gpt-4o-mini",
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "claude": {
        "name": "Anthropic Claude",
        "base_url": None,
        # Claude 4 系列（2025 下半年起）
        "models": [
            "claude-opus-4-8",
            "claude-sonnet-4-6",
            "claude-haiku-4-5-20251001",
        ],
        "cls": AnthropicProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "deepseek": {
        "name": "DeepSeek（深度求索）",
        "base_url": "https://api.deepseek.com",
        # V4 系列（2026-04 发布，1M 上下文）；旧名 deepseek-chat/reasoner 将于 2026-07 退役
        "models": [
            "deepseek-v4-flash",       # 主力对话，低成本
            "deepseek-v4-pro",         # 旗舰
            "deepseek-r2",             # 深度推理
            "deepseek-chat",           # 兼容旧名（路由至 v4-flash）
            "deepseek-reasoner",       # 兼容旧名（路由至 v4 思考模式）
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "qwen": {
        "name": "通义千问（阿里云）",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        # Qwen3.7 系列（2026-05 峰会发布）；Qwen3/Qwen2.5 仍广泛可用
        "models": [
            "qwen3.7-max",
            "qwen3.7-plus",
            "qwen-max",                # Qwen3 旗舰稳定版
            "qwen-plus",               # 均衡性价比
            "qwen-turbo",              # 快速低成本
            "qwen-long",               # 超长上下文
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "moonshot": {
        "name": "Moonshot Kimi（月之暗面）",
        "base_url": "https://api.moonshot.cn/v1",
        # K2.6（2026-04）：1T MoE，262K 上下文；K2.5（2026-01）：多模态
        "models": [
            "kimi-k2-6",
            "kimi-k2-5",
            "kimi-k2",
            "moonshot-v1-128k",        # 原有长上下文稳定版
            "moonshot-v1-32k",
            "moonshot-v1-8k",
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "zhipu": {
        "name": "智谱 GLM",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        # GLM-5.1（2026-04）：8h 长程任务；GLM-5（2026-02）；GLM-4.7（355B MoE）
        "models": [
            "glm-5.1",
            "glm-5",
            "glm-4.7",
            "glm-4-plus",
            "glm-4-flash",             # 免费快速版
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "minimax": {
        "name": "MiniMax",
        "base_url": "https://api.minimax.chat/v1",
        "models": [
            "MiniMax-Text-01",
            "abab6.5s-chat",
            "abab5.5-chat",
        ],
        "cls": OpenAICompatProvider,
        "key_fields": [{"key": "api_key", "label": "API Key", "secret": True}],
    },
    "baidu": {
        "name": "文心（百度）",
        "base_url": None,
        # ERNIE 5.0（2025-11）、4.5（2025-08）、X1 推理模型
        "models": [
            "ernie-5.0-8k",
            "ernie-x1-turbo-32k",
            "ernie-4.5-turbo-128k",
            "ernie-4.5-8k",
            "ernie-4.0-turbo-8k",
            "ernie-lite-8k",
        ],
        "cls": BaiduProvider,
        "key_fields": [
            {"key": "api_key", "label": "Client ID（API Key）", "secret": True},
            {"key": "secret_key", "label": "Client Secret", "secret": True},
        ],
    },
}


def get_provider(provider_id: str, credentials: dict) -> BaseProvider:
    config = PROVIDER_CONFIG.get(provider_id)
    if not config:
        raise ValueError(f"未知的提供商: {provider_id}")

    cls = config["cls"]

    if provider_id == "claude":
        return cls(api_key=credentials.get("api_key", ""))

    if provider_id == "baidu":
        return cls(
            api_key=credentials.get("api_key", ""),
            secret_key=credentials.get("secret_key", ""),
        )

    return cls(
        api_key=credentials.get("api_key", ""),
        base_url=config.get("base_url"),
    )
