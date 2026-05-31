from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routers import export, ai
from routers import auth, projects, chapters, rag

load_dotenv()

app = FastAPI(title="Textbook Editor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册
app.include_router(auth.router,     prefix="/auth",     tags=["auth"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(chapters.router, prefix="/projects", tags=["chapters"])
app.include_router(rag.router,      prefix="/rag",      tags=["rag"])
app.include_router(export.router,   prefix="/export",   tags=["export"])
app.include_router(ai.router,       prefix="/ai",       tags=["ai"])


@app.on_event("startup")
async def startup():
    """自动建表（开发环境；生产环境建议改用 Alembic）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
def root():
    return {"status": "ok", "message": "Textbook Editor API v2 is running"}
