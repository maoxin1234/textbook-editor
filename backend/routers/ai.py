import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from providers.registry import get_provider, PROVIDER_CONFIG

router = APIRouter()


class ChatRequest(BaseModel):
    provider: str
    model: str
    messages: list[dict]
    credentials: dict
    stream: bool = True


@router.get("/providers")
def list_providers():
    """返回所有支持的提供商及其模型列表，供前端设置页展示。"""
    return [
        {
            "id": k,
            "name": v["name"],
            "models": v["models"],
            "key_fields": v["key_fields"],
        }
        for k, v in PROVIDER_CONFIG.items()
    ]


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        provider = get_provider(req.provider, req.credentials)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if req.stream:
        async def generate():
            try:
                async for chunk in provider.chat_stream(req.messages, req.model):
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        result = await provider.chat(req.messages, req.model)
        return {"content": result}
