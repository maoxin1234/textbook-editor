// 书籍项目
export interface TextbookProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// 节点类型
export type NodeType = 'chapter' | 'section' | 'subsection';

// 章节节点 - content 存储 HTML（TipTap 输出格式）
export interface ChapterNode {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  content: string; // HTML 富文本内容
  order: number;
  type: NodeType;
}

// 节点类型配置
export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; maxDepth: number }> = {
  chapter:    { label: '章', maxDepth: 0 },
  section:    { label: '节', maxDepth: 1 },
  subsection: { label: '小节', maxDepth: 2 },
};
