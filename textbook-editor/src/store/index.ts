/**
 * 数据层：全部通过后端 API（PostgreSQL）
 */
import { authFetch } from '../utils/auth';
import { loadAISettings } from './settings';
import type { TextbookProject, ChapterNode } from '../types';

function api(path: string) {
  const { backendUrl } = loadAISettings();
  return `${backendUrl}${path}`;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ─── 项目 ─────────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<TextbookProject[]> {
  const resp = await authFetch(api('/projects'));
  return json<TextbookProject[]>(resp);
}

export async function getProject(id: string): Promise<TextbookProject | undefined> {
  try {
    const resp = await authFetch(api(`/projects/${id}`));
    return json<TextbookProject>(resp);
  } catch { return undefined; }
}

export async function createProject(name: string, description: string): Promise<TextbookProject> {
  const resp = await authFetch(api('/projects'), {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
  return json<TextbookProject>(resp);
}

export async function updateProject(id: string, data: Partial<TextbookProject>): Promise<void> {
  await authFetch(api(`/projects/${id}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await authFetch(api(`/projects/${id}`), { method: 'DELETE' });
}

// ─── 章节 ─────────────────────────────────────────────────────────────────────

export async function getChapters(projectId: string): Promise<ChapterNode[]> {
  const resp = await authFetch(api(`/projects/${projectId}/chapters`));
  return json<ChapterNode[]>(resp);
}

export async function createChapter(
  projectId: string,
  parentId: string | null,
  type: ChapterNode['type'],
  title: string
): Promise<ChapterNode> {
  const resp = await authFetch(api(`/projects/${projectId}/chapters`), {
    method: 'POST',
    body: JSON.stringify({ parent_id: parentId, title, type }),
  });
  return json<ChapterNode>(resp);
}

export async function updateChapter(
  _projectId: string,
  nodeId: string,
  data: Partial<Pick<ChapterNode, 'title' | 'content'>>
): Promise<void> {
  await authFetch(api(`/projects/chapters/${nodeId}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChapter(_projectId: string, nodeId: string): Promise<void> {
  await authFetch(api(`/projects/chapters/${nodeId}`), { method: 'DELETE' });
}

export async function reorderChapters(projectId: string, orderedIds: string[]): Promise<void> {
  await authFetch(api(`/projects/${projectId}/chapters/reorder`), {
    method: 'POST',
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}
