import type { ChapterNode } from '../types';

const CN_NUMBERS = [
  '零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
];

function toChineseNumber(n: number): string {
  if (n < 0 || n >= CN_NUMBERS.length) return String(n + 1);
  return CN_NUMBERS[n];
}

/**
 * 为章节节点生成自动编号
 * chapters: 所有章节节点
 * node: 当前节点
 * 返回: 编号字符串，如 "第一章"、"1.1"、"1.1.1"
 */
export function getNodeNumber(node: ChapterNode, allNodes: ChapterNode[]): string {
  const type = node.type;

  if (type === 'chapter') {
    const chapters = allNodes
      .filter(n => n.type === 'chapter' && n.projectId === node.projectId)
      .sort((a, b) => a.order - b.order);
    const idx = chapters.findIndex(n => n.id === node.id);
    return idx >= 0 ? `第${toChineseNumber(idx + 1)}章` : '';
  }

  if (type === 'section') {
    const chapters = allNodes
      .filter(n => n.type === 'chapter' && n.projectId === node.projectId)
      .sort((a, b) => a.order - b.order);
    const parentChapter = chapters.find(c => c.id === node.parentId);
    if (!parentChapter) return '';

    const chapterIdx = chapters.findIndex(n => n.id === parentChapter.id);
    const sections = allNodes
      .filter(n => n.type === 'section' && n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const sectionIdx = sections.findIndex(n => n.id === node.id);

    return `${chapterIdx + 1}.${sectionIdx + 1}`;
  }

  if (type === 'subsection') {
    const sections = allNodes.filter(n => n.type === 'section' && n.projectId === node.projectId);
    const parentSection = sections.find(s => s.id === node.parentId);
    if (!parentSection) return '';

    const chapters = allNodes
      .filter(n => n.type === 'chapter' && n.projectId === node.projectId)
      .sort((a, b) => a.order - b.order);
    const parentChapter = chapters.find(c => c.id === parentSection.parentId);
    if (!parentChapter) return '';

    const chapterIdx = chapters.findIndex(n => n.id === parentChapter.id);
    const siblingSections = allNodes
      .filter(n => n.type === 'section' && n.parentId === parentSection.parentId)
      .sort((a, b) => a.order - b.order);
    const sectionIdx = siblingSections.findIndex(n => n.id === parentSection.id);
    const subs = allNodes
      .filter(n => n.type === 'subsection' && n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const subIdx = subs.findIndex(n => n.id === node.id);

    return `${chapterIdx + 1}.${sectionIdx + 1}.${subIdx + 1}`;
  }

  return '';
}

/**
 * 构建树形结构：按章节 → 节 → 小节 组织
 */
export function buildTree(nodes: ChapterNode[]): TreeNode[] {
  const chapters = nodes
    .filter(n => n.type === 'chapter')
    .sort((a, b) => a.order - b.order);

  return chapters.map(chapter => {
    const sections = nodes
      .filter(n => n.type === 'section' && n.parentId === chapter.id)
      .sort((a, b) => a.order - b.order);

    return {
      node: chapter,
      children: sections.map(section => {
        const subs = nodes
          .filter(n => n.type === 'subsection' && n.parentId === section.id)
          .sort((a, b) => a.order - b.order);
        return {
          node: section,
          children: subs.map(sub => ({ node: sub, children: [] })),
        };
      }),
    };
  });
}

export interface TreeNode {
  node: ChapterNode;
  children: TreeNode[];
}
