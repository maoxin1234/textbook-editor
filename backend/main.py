from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import export, ai

load_dotenv()

app = FastAPI(title="Textbook Editor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Textbook Editor API is running"}
