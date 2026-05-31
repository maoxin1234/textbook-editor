import { useState, useRef, useCallback } from 'react';
import { Button, Textarea, Space, Tag, MessagePlugin, Divider } from 'tdesign-react';
import { loadAISettings, loadAllCredentials } from '../store/settings';
import { chatStream } from '../utils/api';
import type { AISettings } from '../store/settings';
import RAGPanel from './RAGPanel';

interface AIPanelProps {
  contextText: string;
  onInsert: (text: string) => void;
  projectId?: string;
}

const QUICK_ACTIONS = [
  {
    label: '续写',
    prompt: (ctx: string) =>
      `请根据以下已有内容，续写接下来的段落，风格保持一致：\n\n${ctx}`,
  },
  {
    label: '润色',
    prompt: (ctx: string) =>
      `请对以下文本进行润色，使语言更加流畅、专业：\n\n${ctx}`,
  },
  {
    label: '摘要',
    prompt: (ctx: string) =>
      `请为以下内容生成一段简洁的摘要（200字以内）：\n\n${ctx}`,
  },
  {
    label: '扩写',
    prompt: (ctx: string) =>
      `请对以下内容进行扩写，补充更多细节和说明：\n\n${ctx}`,
  },
];

export default function AIPanel({ contextText, onInsert, projectId }: AIPanelProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [settings] = useState<AISettings>(loadAISettings);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) {
        MessagePlugin.warning('请输入指令');
        return;
      }
      if (loading) return;

      setOutput('');
      setLoading(true);
      abortRef.current = new AbortController();

      const allCreds = loadAllCredentials();
      const credentials = allCreds[settings.provider] ?? {};

      const messages = [
        {
          role: 'system' as const,
          content:
            '你是一位专业的书籍编写助手，擅长中文写作、内容润色和结构优化。请直接输出结果，不要加多余的解释。',
        },
        { role: 'user' as const, content: userMessage },
      ];

      try {
        await chatStream(
          { ...settings, credentials },
          messages,
          chunk => setOutput(prev => prev + chunk),
          () => setLoading(false),
          err => { MessagePlugin.error(err); setLoading(false); },
          abortRef.current.signal,
          { useRag, projectId },
        );
      } catch (e: any) {
        if (e?.name !== 'AbortError') MessagePlugin.error(String(e));
        setLoading(false);
      }
    },
    [loading, settings]
  );

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 10,
        padding: '8px 0',
      }}
    >
      {/* 当前模型标签 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Tag size="small" theme="primary" variant="light">{settings.provider}</Tag>
        <Tag size="small" theme="default" variant="light">{settings.model}</Tag>
        <a href="#/settings" style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>更改</a>
      </div>

      {/* 参考资料 / RAG */}
      {projectId && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>参考资料（RAG）</div>
          <RAGPanel projectId={projectId} useRag={useRag} onToggle={setUseRag} />
        </>
      )}


      {/* 快捷操作 */}
      <div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>快捷操作（基于当前章节内容）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.label}
              size="small"
              variant="outline"
              disabled={loading || !contextText.trim()}
              onClick={() => run(action.prompt(contextText))}
            >
              {action.label}
            </Button>
          ))}
        </div>
        {!contextText.trim() && (
          <p style={{ fontSize: 12, color: '#bbb', margin: '4px 0 0' }}>
            当前章节无内容，快捷操作不可用
          </p>
        )}
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* 自定义指令 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: '#999' }}>自定义指令</div>
        <Textarea
          value={customPrompt}
          onChange={v => setCustomPrompt(v as string)}
          placeholder="输入任意指令，例如：帮我写一段关于…的引言"
          autosize={{ minRows: 2, maxRows: 4 }}
        />
        <Button
          theme="primary"
          size="small"
          onClick={() => run(customPrompt)}
          disabled={loading}
          style={{ alignSelf: 'flex-end' }}
        >
          发送
        </Button>
      </div>

      {/* 输出区 */}
      {(output || loading) && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ fontSize: 12, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
            <span>AI 输出</span>
            {loading && (
              <Button size="small" variant="text" theme="danger" onClick={handleStop}>
                停止
              </Button>
            )}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 80,
              maxHeight: 320,
              overflow: 'auto',
              background: '#fafafa',
              border: '1px solid #e7e7e7',
              borderRadius: 6,
              padding: 10,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {output}
            {loading && <span style={{ color: '#0052d9' }}>▌</span>}
          </div>
          {output && !loading && (
            <Space size={8} style={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(output);
                  MessagePlugin.success('已复制');
                }}
              >
                复制
              </Button>
              <Button
                size="small"
                theme="primary"
                onClick={() => {
                  onInsert(output);
                  MessagePlugin.success('已插入到编辑器');
                }}
              >
                插入到编辑器
              </Button>
            </Space>
          )}
        </>
      )}
    </div>
  );
}
