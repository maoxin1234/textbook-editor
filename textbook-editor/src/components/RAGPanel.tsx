import { useState, useEffect, useRef } from 'react';
import { Button, Switch, MessagePlugin, Tag } from 'tdesign-react';
import { UploadIcon, DeleteIcon } from 'tdesign-icons-react';
import { authFetch } from '../utils/auth';
import { loadAISettings } from '../store/settings';

interface RagDoc {
  id: string;
  filename: string;
  chunk_count: number;
  content_type: string;
}

interface RAGPanelProps {
  projectId: string;
  useRag: boolean;
  onToggle: (val: boolean) => void;
}

const ACCEPT = '.pdf,.docx,.txt,.md';

export default function RAGPanel({ projectId, useRag, onToggle }: RAGPanelProps) {
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { backendUrl } = loadAISettings();

  async function loadDocs() {
    try {
      const resp = await authFetch(`${backendUrl}/rag/${projectId}/documents`);
      if (resp.ok) setDocs(await resp.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { loadDocs(); }, [projectId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${backendUrl}/rag/${projectId}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json();
        MessagePlugin.error(err.detail || '上传失败');
        return;
      }
      const doc: RagDoc = await resp.json();
      MessagePlugin.success(`「${doc.filename}」上传成功，共 ${doc.chunk_count} 个文本块`);
      await loadDocs();
    } catch {
      MessagePlugin.error('上传失败，请检查后端连接');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string, filename: string) {
    try {
      await authFetch(`${backendUrl}/rag/${projectId}/documents/${docId}`, { method: 'DELETE' });
      MessagePlugin.success(`已删除「${filename}」`);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      MessagePlugin.error('删除失败');
    }
  }

  const typeLabel = (ct: string) => {
    if (ct.includes('pdf')) return 'PDF';
    if (ct.includes('word') || ct.includes('docx')) return 'DOCX';
    if (ct.includes('markdown')) return 'MD';
    return 'TXT';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 开关 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>基于参考资料写作</span>
        <Switch
          value={useRag}
          onChange={v => onToggle(v as boolean)}
          disabled={docs.length === 0}
          size="small"
        />
      </div>
      {docs.length === 0 && (
        <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>上传参考资料后可启用 RAG 增强</p>
      )}

      {/* 文档列表 */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', background: '#f8f8f8', borderRadius: 6,
                border: '1px solid #eee',
              }}
            >
              <Tag size="small" theme="default" variant="light" style={{ flexShrink: 0 }}>
                {typeLabel(doc.content_type)}
              </Tag>
              <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.filename}
              </span>
              <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{doc.chunk_count} 块</span>
              <Button
                size="small"
                variant="text"
                theme="danger"
                icon={<DeleteIcon />}
                onClick={() => handleDelete(doc.id, doc.filename)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      <Button
        variant="outline"
        size="small"
        icon={<UploadIcon />}
        loading={uploading}
        onClick={() => fileRef.current?.click()}
        block
      >
        上传参考资料
      </Button>
      <input ref={fileRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleUpload} />
      <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>
        支持 PDF · DOCX · TXT · MD，单文件 ≤ 10MB
      </p>
    </div>
  );
}
