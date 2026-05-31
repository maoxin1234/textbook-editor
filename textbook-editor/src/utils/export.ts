import type { ChapterNode } from '../types';
import { buildTree, getNodeNumber } from './numbering';

/**
 * HTML 转纯文本（用于 Markdown 导出时剥离 HTML 标签）
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<h[1-6]>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<img[^>]+alt="([^"]*)"[^>]*\/?>/gi, '[图片: $1]')
    .replace(/<img[^>]*\/?>/gi, '[图片]')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 导出章节树为 Markdown 字符串
 */
export function exportToMarkdown(
  projectName: string,
  nodes: ChapterNode[]
): string {
  const tree = buildTree(nodes);
  const allNodes = nodes;

  let md = `# ${projectName}\n\n`;

  function renderNode(node: ChapterNode, level: number) {
    const number = getNodeNumber(node, allNodes);
    const prefix = '#'.repeat(Math.min(level + 2, 6));
    const heading = number ? `${prefix} ${number} ${node.title}` : `${prefix} ${node.title}`;
    md += `${heading}\n\n`;

    if (node.content.trim()) {
      // 将 HTML 内容转为纯文本
      const textContent = htmlToText(node.content);
      if (textContent) {
        md += `${textContent}\n\n`;
      }
    }
  }

  function walkTree(nodes: typeof tree, level: number) {
    for (const item of nodes) {
      renderNode(item.node, level);
      walkTree(item.children, level + 1);
    }
  }

  walkTree(tree, 0);
  return md.trim();
}

/**
 * 导出 HTML 格式（保留完整格式）
 */
export function exportToHtml(
  projectName: string,
  nodes: ChapterNode[]
): string {
  const tree = buildTree(nodes);
  const allNodes = nodes;

  let html = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n`;
  html += `<meta charset="UTF-8">\n`;
  html += `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
  html += `<title>${projectName}</title>\n`;
  html += `<style>
body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
h1 { border-bottom: 2px solid #0052d9; padding-bottom: 10px; }
h2 { margin-top: 30px; color: #0052d9; }
h3 { margin-top: 24px; }
img { max-width: 100%; border-radius: 6px; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
td, th { border: 1px solid #ddd; padding: 8px 12px; }
th { background: #f5f7fa; }
blockquote { border-left: 3px solid #0052d9; padding-left: 16px; color: #666; }
pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
</style>\n`;
  html += `</head>\n<body>\n`;
  html += `<h1>${projectName}</h1>\n\n`;

  function renderNode(node: ChapterNode, level: number) {
    const number = getNodeNumber(node, allNodes);
    const hLevel = Math.min(level + 2, 6);
    const heading = number ? `${number} ${node.title}` : node.title;
    html += `<h${hLevel}>${heading}</h${hLevel}>\n`;

    if (node.content.trim()) {
      html += `<div class="content">\n${node.content.trim()}\n</div>\n\n`;
    }
  }

  function walkTree(nodes: typeof tree, level: number) {
    for (const item of nodes) {
      renderNode(item.node, level);
      walkTree(item.children, level + 1);
    }
  }

  walkTree(tree, 0);
  html += `</body>\n</html>`;
  return html;
}

/**
 * 下载 Markdown 文件
 */
export function downloadMarkdown(filename: string, content: string) {
  downloadFile(`${filename}.md`, content, 'text/markdown;charset=utf-8');
}

/**
 * 下载 HTML 文件
 */
export function downloadHtml(filename: string, content: string) {
  downloadFile(`${filename}.html`, content, 'text/html;charset=utf-8');
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
