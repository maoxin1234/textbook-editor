from datetime import datetime
from pydantic import BaseModel, EmailStr


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ─── Chapter ──────────────────────────────────────────────────────────────────

class ChapterCreate(BaseModel):
    parent_id: str | None = None
    title: str
    type: str = "chapter"

class ChapterUpdate(BaseModel):
    title: str | None = None
    content: str | None = None

class ChapterOut(BaseModel):
    id: str
    project_id: str
    parent_id: str | None
    title: str
    content: str
    order: int
    type: str
    model_config = {"from_attributes": True}

class ReorderRequest(BaseModel):
    ordered_ids: list[str]


# ─── RAG ──────────────────────────────────────────────────────────────────────

class RagDocumentOut(BaseModel):
    id: str
    project_id: str
    filename: str
    content_type: str
    chunk_count: int
    created_at: datetime
    model_config = {"from_attributes": True}
