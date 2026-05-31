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
    # RAG 参数
    use_rag: bool = False
    project_id: str | None = None
    rag_top_k: int = 4


@router.get("/providers")
def list_providers():
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

    messages = _inject_rag_context(req)

    if req.stream:
        async def generate():
            try:
                async for chunk in provider.chat_stream(messages, req.model):
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        result = await provider.chat(messages, req.model)
        return {"content": result}


def _inject_rag_context(req: ChatRequest) -> list[dict]:
    """若 use_rag=True，检索相关文档块并注入 system prompt。"""
    if not req.use_rag or not req.project_id:
        return req.messages

    # 用最后一条 user 消息作为检索 query
    query = ""
    for msg in reversed(req.messages):
        if msg.get("role") == "user":
            query = msg["content"]
            break
    if not query:
        return req.messages

    from routers.rag import retrieve_context
    context = retrieve_context(req.project_id, query, req.rag_top_k)
    if not context:
        return req.messages

    rag_system = (
        "以下是用户上传的参考资料，请优先基于这些资料回答问题，"
        "资料中没有的内容可以结合自身知识补充：\n\n"
        f"{context}"
    )

    messages = list(req.messages)
    # 找到已有 system 消息并追加，或插入新的
    for i, msg in enumerate(messages):
        if msg.get("role") == "system":
            messages[i] = {"role": "system", "content": msg["content"] + "\n\n" + rag_system}
            return messages
    messages.insert(0, {"role": "system", "content": rag_system})
    return messages
