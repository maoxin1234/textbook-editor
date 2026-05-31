import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Space,
  MessagePlugin,
  Dialog,
  Tag,
  Tree,
  Popconfirm,
} from 'tdesign-react';
import {
  AddIcon,
  DeleteIcon,
  ChevronLeftIcon,
  FileIcon,
  FileExportIcon,
  SearchIcon,
  ChatIcon,
} from 'tdesign-icons-react';
import RichTextEditor from '../components/RichTextEditor';
import AIPanel from '../components/AIPanel';
import {
  getProject,
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
} from '../store';
import { getNodeNumber, buildTree } from '../utils/numbering';
import { exportToMarkdown, downloadMarkdown, exportToHtml } from '../utils/export';
import { exportDocx, exportPdf, loadAISettings } from '../utils/api';
import { useDebouncedCallback } from '../hooks/useDebounce';
import type { TextbookProject, ChapterNode, NodeType } from '../types';

type ExportFormat = 'markdown' | 'html' | 'docx' | 'pdf';

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<TextbookProject | null>(null);
  const [nodes, setNodes] = useState<ChapterNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeType, setNewNodeType] = useState<NodeType>('chapter');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [searchText, setSearchText] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 用 ref 持有最新的 nodes，供 debounce 回调使用
  const nodesRef = useRef<ChapterNode[]>([]);
  nodesRef.current = nodes;

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const p = await getProject(projectId);
    if (!p) { navigate('/'); return; }
    setProject(p);
    setNodes(await getChapters(projectId));
  }, [projectId, navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    if (selectedNode) {
      setEditingContent(selectedNode.content);
      setEditingTitle(selectedNode.title);
    } else {
      setEditingContent('');
      setEditingTitle('');
    }
  }, [selectedNodeId, selectedNode?.id]);

  // ── 防抖保存（800ms）──────────────────────────────────────────────────────

  const debouncedSave = useDebouncedCallback(
    async (nodeId: string, content: string, title: string) => {
      if (!projectId) return;
      await updateChapter(projectId, nodeId, { content, title });
      setNodes(await getChapters(projectId));
      setSaveStatus('saved');
    },
    800
  );

  const saveContent = useCallback(
    (nodeId: string | null, content: string, title: string) => {
      if (!projectId || !nodeId) return;
      setSaveStatus('saving');
      debouncedSave(nodeId, content, title);
    },
    [projectId, debouncedSave]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      setEditingTitle(title);
      saveContent(selectedNodeId, editingContent, title);
    },
    [selectedNodeId, editingContent, saveContent]
  );

  const handleContentChange = useCallback(
    (html: string) => {
      setEditingContent(html);
      saveContent(selectedNodeId, html, editingTitle);
    },
    [selectedNodeId, editingTitle, saveContent]
  );

  // ── 添加节点 ──────────────────────────────────────────────────────────────

  const handleAddNode = async () => {
    if (!projectId || !newNodeTitle.trim()) {
      MessagePlugin.warning('请输入标题');
      return;
    }
    let parentId: string | null = null;
    if (newNodeType === 'section' && selectedNode) {
      if (selectedNode.type === 'chapter') parentId = selectedNode.id;
      else if (selectedNode.type === 'section') parentId = selectedNode.parentId;
      else { MessagePlugin.warning('请先选择一个章或节'); return; }
    } else if (newNodeType === 'subsection' && selectedNode) {
      if (selectedNode.type === 'section') parentId = selectedNode.id;
      else { MessagePlugin.warning('请先选择一个节'); return; }
    }
    const node = await createChapter(projectId, parentId, newNodeType, newNodeTitle.trim());
    setNewNodeTitle('');
    setShowAddNode(false);
    await refresh();
    setSelectedNodeId(node.id);
    MessagePlugin.success('添加成功！');
  };

  // ── 删除节点（带确认） ────────────────────────────────────────────────────

  const handleDeleteNode = async () => {
    if (!projectId || !selectedNodeId) return;
    await deleteChapter(projectId, selectedNodeId);
    setSelectedNodeId(null);
    await refresh();
    MessagePlugin.success('已删除');
  };

  // ── 拖拽排序 ──────────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    async ({ node: dragNode, dropNode, dropPosition }: any) => {
      if (!projectId) return;
      const all = nodesRef.current;

      // 只允许同级拖拽
      const dragItem = all.find(n => n.id === dragNode.value);
      const dropItem = all.find(n => n.id === dropNode.value);
      if (!dragItem || !dropItem || dragItem.parentId !== dropItem.parentId) {
        MessagePlugin.warning('暂不支持跨层级拖拽');
        return;
      }

      const siblings = all
        .filter(n => n.parentId === dragItem.parentId)
        .sort((a, b) => a.order - b.order);

      const fromIdx = siblings.findIndex(n => n.id === dragItem.id);
      const toIdx = siblings.findIndex(n => n.id === dropItem.id);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(fromIdx, 1);
      const insertAt = dropPosition === -1 ? toIdx : toIdx + 1;
      reordered.splice(Math.max(0, insertAt), 0, moved);

      await reorderChapters(projectId, reordered.map(n => n.id));
      await refresh();
    },
    [projectId, refresh]
  );

  // ── 导出 ──────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!project) return;
    setExportLoading(true);
    try {
      if (exportFormat === 'markdown') {
        const md = exportToMarkdown(project.name, nodes);
        downloadMarkdown(project.name, md);
        MessagePlugin.success('导出成功！');
        setShowExport(false);
      } else if (exportFormat === 'html') {
        const html = exportToHtml(project.name, nodes);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${project.name}.html`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        MessagePlugin.success('导出成功！');
        setShowExport(false);
      } else {
        const { backendUrl } = loadAISettings();
        const html = exportToHtml(project.name, nodes);
        if (exportFormat === 'docx') {
          await exportDocx(backendUrl, project.name, html);
        } else {
          await exportPdf(backendUrl, project.name, html);
        }
        MessagePlugin.success('导出成功！');
        setShowExport(false);
      }
    } catch (e: any) {
      MessagePlugin.error(`导出失败：${e.message ?? e}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ── 树数据 ────────────────────────────────────────────────────────────────

  const treeData = (() => {
    const tree = buildTree(nodes);
    function toTreeData(items: ReturnType<typeof buildTree>): any[] {
      return items.map(item => {
        const number = getNodeNumber(item.node, nodes);
        const label =
          number && !item.node.title.startsWith(number)
            ? `${number} ${item.node.title}`
            : item.node.title;
        return { value: item.node.id, label, children: toTreeData(item.children) };
      });
    }
    return toTreeData(tree);
  })();

  // 搜索过滤
  const filteredTreeData = searchText.trim()
    ? treeData.filter(n =>
        JSON.stringify(n).toLowerCase().includes(searchText.toLowerCase())
      )
    : treeData;

  const getAvailableTypes = (): NodeType[] => {
    if (!selectedNode) return ['chapter'];
    if (selectedNode.type === 'chapter') return ['section'];
    if (selectedNode.type === 'section') return ['section', 'subsection'];
    if (selectedNode.type === 'subsection') return ['section'];
    return ['chapter'];
  };

  const typeLabel: Record<NodeType, string> = {
    chapter: '章', section: '节', subsection: '小节',
  };

  // AI 面板插入文本
  const handleAIInsert = useCallback(
    (text: string) => {
      if (!selectedNodeId) return;
      const appended = editingContent + `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
      setEditingContent(appended);
      saveContent(selectedNodeId, appended, editingTitle);
    },
    [selectedNodeId, editingContent, editingTitle, saveContent]
  );

  // 当前章节纯文本（供 AI 面板使用）
  const contextText = editingContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', gap: 16 }}>
      {/* ── 左侧章节树 ─────────────────────────────────────────────────────── */}
      <Card
        style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        title={
          <Space>
            <Button variant="text" icon={<ChevronLeftIcon />} onClick={() => navigate('/')} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{project?.name || '章节结构'}</span>
          </Space>
        }
        actions={
          <Button
            size="small"
            variant="outline"
            icon={<AddIcon />}
            onClick={() => { setNewNodeType('chapter'); setNewNodeTitle(''); setShowAddNode(true); }}
          >
            新增
          </Button>
        }
      >
        {/* 搜索框 */}
        <div style={{ padding: '0 0 8px' }}>
          <Input
            prefixIcon={<SearchIcon />}
            placeholder="搜索章节..."
            value={searchText}
            onChange={v => setSearchText(v as string)}
            size="small"
            clearable
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredTreeData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: 32, fontSize: 13 }}>
              {searchText ? '无匹配章节' : '点击"新增"添加章节'}
            </div>
          ) : (
            <Tree
              data={filteredTreeData}
              activable
              actived={selectedNodeId ? [selectedNodeId] : []}
              onActive={v => {
                const id = Array.isArray(v) ? v[0] : v;
                setSelectedNodeId(id as string);
              }}
              expandAll
              hover
              draggable={!searchText}
              onDrop={handleDrop}
              style={{ background: 'transparent' }}
            />
          )}
        </div>
      </Card>

      {/* ── 右侧编辑区 ──────────────────────────────────────────────────────── */}
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        title={
          selectedNode ? (
            <Space>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedNode.title || '未命名'}</span>
              <Tag size="small" theme="primary" variant="light">{typeLabel[selectedNode.type]}</Tag>
            </Space>
          ) : (
            <span style={{ color: '#999', fontSize: 13 }}>请在左侧选择章节</span>
          )
        }
        actions={
          <Space size={8}>
            <span style={{ fontSize: 12, color: saveStatus === 'saved' ? '#52c41a' : '#faad14' }}>
              {saveStatus === 'saved' ? '✓ 已保存' : '● 保存中...'}
            </span>
            <Button
              variant={showAI ? 'base' : 'outline'}
              theme={showAI ? 'primary' : 'default'}
              icon={<ChatIcon />}
              onClick={() => setShowAI(v => !v)}
              size="small"
            >
              AI 助手
            </Button>
            <Button
              variant="outline"
              icon={<FileExportIcon />}
              onClick={() => setShowExport(true)}
              disabled={nodes.length === 0}
            >
              导出
            </Button>
            {selectedNode && (
              <>
                <Button
                  size="small"
                  variant="outline"
                  icon={<AddIcon />}
                  onClick={() => {
                    const types = getAvailableTypes();
                    setNewNodeType(types[0]);
                    setNewNodeTitle('');
                    setShowAddNode(true);
                  }}
                >
                  添加子节点
                </Button>
                <Popconfirm
                  content="确定删除该节点及其所有子节点吗？此操作不可恢复。"
                  onConfirm={handleDeleteNode}
                  confirmBtn={{ content: '删除', theme: 'danger' }}
                >
                  <Button size="small" variant="text" theme="danger" icon={<DeleteIcon />}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        }
      >
        <div style={{ display: 'flex', flex: 1, gap: 12, overflow: 'hidden' }}>
          {/* 编辑主区 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minWidth: 0 }}>
            {selectedNode ? (
              <>
                <Input
                  value={editingTitle}
                  onChange={v => handleTitleChange(v as string)}
                  placeholder="输入章节标题..."
                  style={{ fontSize: 16, fontWeight: 600 }}
                  size="large"
                />
                <div style={{ flex: 1, minHeight: 0 }}>
                  <RichTextEditor
                    key={selectedNodeId}
                    content={editingContent}
                    onChange={handleContentChange}
                  />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                <div style={{ textAlign: 'center' }}>
                  <FileIcon size="64px" />
                  <p style={{ marginTop: 16, fontSize: 14 }}>选择左侧章节开始编写</p>
                </div>
              </div>
            )}
          </div>

          {/* AI 面板（内联，右侧） */}
          {showAI && (
            <div
              style={{
                width: 300,
                flexShrink: 0,
                borderLeft: '1px solid #e7e7e7',
                paddingLeft: 12,
                overflow: 'auto',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#0052d9' }}>
                AI 写作助手
              </div>
              <AIPanel
                contextText={contextText}
                onInsert={handleAIInsert}
              />
            </div>
          )}
        </div>
      </Card>

      {/* ── 添加节点弹窗 ─────────────────────────────────────────────────────── */}
      <Dialog
        header="添加章节节点"
        visible={showAddNode}
        onClose={() => setShowAddNode(false)}
        onConfirm={handleAddNode}
        confirmBtn="确认添加"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>节点类型</label>
            <Space>
              {getAvailableTypes().map(type => (
                <Button
                  key={type}
                  variant={newNodeType === type ? 'base' : 'outline'}
                  theme={newNodeType === type ? 'primary' : 'default'}
                  onClick={() => setNewNodeType(type)}
                  size="small"
                >
                  {typeLabel[type]}
                </Button>
              ))}
            </Space>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>标题 *</label>
            <Input
              placeholder="输入标题..."
              value={newNodeTitle}
              onChange={v => setNewNodeTitle(v as string)}
              onEnter={handleAddNode}
            />
          </div>
        </div>
      </Dialog>

      {/* ── 导出弹窗 ─────────────────────────────────────────────────────────── */}
      <Dialog
        header="导出书籍"
        visible={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
        confirmBtn={{ content: '导出', loading: exportLoading }}
        width={680}
      >
        {/* 格式选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>选择格式</label>
          <Space>
            {(
              [
                { value: 'markdown' as ExportFormat, label: 'Markdown (.md)', needBackend: false },
                { value: 'html' as ExportFormat, label: 'HTML (.html)', needBackend: false },
                { value: 'docx' as ExportFormat, label: 'Word (.docx)', needBackend: true },
                { value: 'pdf' as ExportFormat, label: 'PDF (.pdf)', needBackend: true },
              ]
            ).map(f => (
              <Button
                key={f.value}
                variant={exportFormat === f.value ? 'base' : 'outline'}
                theme={exportFormat === f.value ? 'primary' : 'default'}
                onClick={() => setExportFormat(f.value)}
              >
                {f.label}
                {f.needBackend && (
                  <Tag size="small" theme="warning" variant="light" style={{ marginLeft: 4 }}>
                    后端
                  </Tag>
                )}
              </Button>
            ))}
          </Space>
          {(exportFormat === 'docx' || exportFormat === 'pdf') && (
            <p style={{ color: '#faad14', fontSize: 12, margin: '8px 0 0' }}>
              需要后端服务运行中。请先在「设置」页配置后端地址。
            </p>
          )}
        </div>

        {/* 预览（仅 markdown/html）*/}
        {(exportFormat === 'markdown' || exportFormat === 'html') && project && nodes.length > 0 && (
          <pre
            style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 8,
              maxHeight: 320,
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {exportFormat === 'markdown'
              ? exportToMarkdown(project.name, nodes)
              : exportToHtml(project.name, nodes)}
          </pre>
        )}
        {(exportFormat === 'docx' || exportFormat === 'pdf') && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
            点击「导出」生成并下载文件
          </div>
        )}
      </Dialog>
    </div>
  );
}
