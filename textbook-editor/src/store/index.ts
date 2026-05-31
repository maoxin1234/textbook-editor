/**
 * 数据层：IndexedDB（通过 idb 库）
 * 首次打开时自动把旧 localStorage 数据迁移过来。
 */
import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { TextbookProject, ChapterNode } from '../types';

// ─── DB 初始化 ────────────────────────────────────────────────────────────────

const DB_NAME = 'textbook-editor';
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function db(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('projects')) {
        const ps = database.createObjectStore('projects', { keyPath: 'id' });
        ps.createIndex('updatedAt', 'updatedAt');
      }
      if (!database.objectStoreNames.contains('chapters')) {
        const cs = database.createObjectStore('chapters', { keyPath: 'id' });
        cs.createIndex('projectId', 'projectId');
      }
    },
  });

  await _migrateFromLocalStorage(_db);
  return _db;
}

/** 将旧版 localStorage 数据一次性导入 IndexedDB，然后清除。 */
async function _migrateFromLocalStorage(database: IDBPDatabase) {
  const PROJECTS_KEY = 'textbook_projects';
  const CHAPTERS_PREFIX = 'textbook_chapters_';

  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return;

  try {
    const projects: TextbookProject[] = JSON.parse(raw);
    for (const p of projects) {
      await database.put('projects', p);
      const chapRaw = localStorage.getItem(CHAPTERS_PREFIX + p.id);
      if (chapRaw) {
        const chapters: ChapterNode[] = JSON.parse(chapRaw);
        for (const c of chapters) {
          await database.put('chapters', c);
        }
        localStorage.removeItem(CHAPTERS_PREFIX + p.id);
      }
    }
    localStorage.removeItem(PROJECTS_KEY);
  } catch {
    // 迁移失败不中断正常流程
  }
}

// ─── 项目操作 ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<TextbookProject[]> {
  const d = await db();
  const all: TextbookProject[] = await d.getAll('projects');
  return all.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getProject(id: string): Promise<TextbookProject | undefined> {
  const d = await db();
  return d.get('projects', id);
}

export async function createProject(
  name: string,
  description: string
): Promise<TextbookProject> {
  const now = new Date().toISOString();
  const project: TextbookProject = {
    id: uuidv4(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
  };
  const d = await db();
  await d.put('projects', project);
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<TextbookProject>
): Promise<void> {
  const d = await db();
  const existing = await d.get('projects', id);
  if (!existing) return;
  await d.put('projects', {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  const d = await db();
  await d.delete('projects', id);
  // 删除关联章节
  const chapters = await d.getAllFromIndex('chapters', 'projectId', id);
  const tx = d.transaction('chapters', 'readwrite');
  await Promise.all(chapters.map(c => tx.store.delete(c.id)));
  await tx.done;
}

// ─── 章节操作 ─────────────────────────────────────────────────────────────────

export async function getChapters(projectId: string): Promise<ChapterNode[]> {
  const d = await db();
  const all: ChapterNode[] = await d.getAllFromIndex('chapters', 'projectId', projectId);
  return all.sort((a, b) => a.order - b.order);
}

export async function createChapter(
  projectId: string,
  parentId: string | null,
  type: ChapterNode['type'],
  title: string
): Promise<ChapterNode> {
  const d = await db();
  const all: ChapterNode[] = await d.getAllFromIndex('chapters', 'projectId', projectId);
  const siblings = all.filter(c => c.parentId === parentId);
  const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : -1;

  const node: ChapterNode = {
    id: uuidv4(),
    projectId,
    parentId,
    title,
    content: '',
    order: maxOrder + 1,
    type,
  };
  await d.put('chapters', node);
  await updateProject(projectId, {});
  return node;
}

export async function updateChapter(
  projectId: string,
  nodeId: string,
  data: Partial<Pick<ChapterNode, 'title' | 'content'>>
): Promise<void> {
  const d = await db();
  const existing = await d.get('chapters', nodeId);
  if (!existing) return;
  await d.put('chapters', { ...existing, ...data });
  await updateProject(projectId, {});
}

export async function deleteChapter(
  projectId: string,
  nodeId: string
): Promise<void> {
  const d = await db();
  const all: ChapterNode[] = await d.getAllFromIndex('chapters', 'projectId', projectId);

  const idsToDelete = new Set<string>();
  function collectChildren(parentId: string) {
    all
      .filter(c => c.parentId === parentId)
      .forEach(child => {
        idsToDelete.add(child.id);
        collectChildren(child.id);
      });
  }
  idsToDelete.add(nodeId);
  collectChildren(nodeId);

  const tx = d.transaction('chapters', 'readwrite');
  await Promise.all([...idsToDelete].map(id => tx.store.delete(id)));
  await tx.done;
  await updateProject(projectId, {});
}

export async function reorderChapters(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const d = await db();
  const tx = d.transaction('chapters', 'readwrite');
  await Promise.all(
    orderedIds.map(async (id, index) => {
      const node = await tx.store.get(id);
      if (node) await tx.store.put({ ...node, order: index });
    })
  );
  await tx.done;
  await updateProject(projectId, {});
}
