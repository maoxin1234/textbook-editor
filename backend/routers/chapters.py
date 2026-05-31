from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import uuid

from database import get_db
from models import User, Project, Chapter
from schemas import ChapterCreate, ChapterUpdate, ChapterOut, ReorderRequest
from deps import get_current_user

router = APIRouter()


@router.get("/{project_id}/chapters", response_model=list[ChapterOut])
async def list_chapters(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_owner(project_id, current_user.id, db)
    result = await db.execute(
        select(Chapter)
        .where(Chapter.project_id == project_id)
        .order_by(Chapter.order)
    )
    return result.scalars().all()


@router.post("/{project_id}/chapters", response_model=ChapterOut, status_code=201)
async def create_chapter(
    project_id: str,
    body: ChapterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_owner(project_id, current_user.id, db)

    # 计算同级最大 order
    result = await db.execute(
        select(Chapter).where(
            Chapter.project_id == project_id,
            Chapter.parent_id == body.parent_id,
        )
    )
    siblings = result.scalars().all()
    max_order = max((s.order for s in siblings), default=-1)

    chapter = Chapter(
        id=str(uuid.uuid4()),
        project_id=project_id,
        parent_id=body.parent_id,
        title=body.title,
        type=body.type,
        order=max_order + 1,
    )
    db.add(chapter)
    await _touch_project(project_id, db)
    await db.commit()
    await db.refresh(chapter)
    return chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterOut)
async def update_chapter(
    chapter_id: str,
    body: ChapterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chapter = await _get_chapter_owned(chapter_id, current_user.id, db)
    if body.title is not None:
        chapter.title = body.title
    if body.content is not None:
        chapter.content = body.content
    await _touch_project(chapter.project_id, db)
    await db.commit()
    await db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=204)
async def delete_chapter(
    chapter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chapter = await _get_chapter_owned(chapter_id, current_user.id, db)
    project_id = chapter.project_id
    # 递归删除子节点
    await _delete_recursive(chapter_id, db)
    await _touch_project(project_id, db)
    await db.commit()


@router.post("/{project_id}/chapters/reorder", status_code=204)
async def reorder_chapters(
    project_id: str,
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_owner(project_id, current_user.id, db)
    for index, chapter_id in enumerate(body.ordered_ids):
        chapter = await db.get(Chapter, chapter_id)
        if chapter and chapter.project_id == project_id:
            chapter.order = index
    await _touch_project(project_id, db)
    await db.commit()


# ─── 工具 ──────────────────────────────────────────────────────────────────────

async def _assert_owner(project_id: str, user_id: int, db: AsyncSession):
    project = await db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="项目不存在")

async def _get_chapter_owned(chapter_id: str, user_id: int, db: AsyncSession) -> Chapter:
    chapter = await db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    project = await db.get(Project, chapter.project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权访问")
    return chapter

async def _delete_recursive(chapter_id: str, db: AsyncSession):
    result = await db.execute(select(Chapter).where(Chapter.parent_id == chapter_id))
    for child in result.scalars().all():
        await _delete_recursive(child.id, db)
    chapter = await db.get(Chapter, chapter_id)
    if chapter:
        await db.delete(chapter)

async def _touch_project(project_id: str, db: AsyncSession):
    project = await db.get(Project, project_id)
    if project:
        project.updated_at = datetime.now(timezone.utc)
