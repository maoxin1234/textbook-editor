import { useCallback, useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Underline } from '@tiptap/extension-underline';
import { Button, Space, Divider, MessagePlugin } from 'tdesign-react';
import {
  UndoIcon,
  RedoIcon,
  FormatBoldIcon,
  FormatItalicIcon,
  FormatUnderlineIcon,
  FormatStrikethroughIcon,
  FormatQuoteIcon,
  FormatListBulletedIcon,
  FormatListNumberedIcon,
  FormatHorizontalRuleIcon,
  CodeIcon,
  FormatClearIcon,
  ImageIcon,
  TableIcon,
} from './Icons';
import { FontSize } from '../extensions/FontSize';
import './RichTextEditor.css';

// ─── 常量 ──────────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
];

const FONT_SIZES = [
  { label: '小五 (9pt)', value: '9pt' },
  { label: '五号 (10.5pt)', value: '10.5pt' },
  { label: '小四 (12pt)', value: '12pt' },
  { label: '四号 (14pt)', value: '14pt' },
  { label: '小三 (15pt)', value: '15pt' },
  { label: '三号 (16pt)', value: '16pt' },
  { label: '小二 (18pt)', value: '18pt' },
  { label: '二号 (22pt)', value: '22pt' },
  { label: '一号 (26pt)', value: '26pt' },
  { label: '小初 (36pt)', value: '36pt' },
  { label: '初号 (42pt)', value: '42pt' },
];

const HIGHLIGHT_COLORS = [
  { label: '黄色', value: '#FFFF00' },
  { label: '绿色', value: '#90EE90' },
  { label: '青色', value: '#B0E8FF' },
  { label: '粉色', value: '#FFB6C1' },
  { label: '橙色', value: '#FFD700' },
  { label: '紫色', value: '#E0B0FF' },
];

// ─── 对齐图标（复用已有的 FormatLineSpacingIcon 占位 → 改用 SVG） ─────────────

function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3zm0 4h18v2H3z"/>
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v2H3zm3 4h12v2H6zm-3 4h18v2H3zm3 4h12v2H6zm-3 4h18v2H3z"/>
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3z"/>
    </svg>
  );
}

// ─── 组件 ──────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);

  const [textColor, setTextColor] = useState('#000000');
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: '开始编写内容...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: 'rich-editor-content' },
    },
  });

  // 外部 content 变化时同步（切换章节）
  useEffect(() => {
    if (editor && !isInternalUpdate.current) {
      if (editor.getHTML() !== content) {
        editor.chain().setContent(content).run();
      }
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  // 点击高亮选色器外部时关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) {
        setShowHighlightPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleImageUpload = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      if (!file.type.startsWith('image/')) { MessagePlugin.warning('请选择图片文件'); return; }
      if (file.size > 5 * 1024 * 1024) { MessagePlugin.warning('图片大小不能超过 5MB'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [editor]
  );

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  // 当前字体族（读取选区的 fontFamily 属性）
  const currentFontFamily =
    editor.getAttributes('textStyle').fontFamily ?? FONT_FAMILIES[0].value;
  const currentFontSize =
    editor.getAttributes('textStyle').fontSize ?? '';

  return (
    <div className="rich-editor-wrapper">
      {/* ── 工具栏 ───────────────────────────────────────────────────────── */}
      <div className="rich-editor-toolbar">
        {/* 撤销 / 重做 */}
        <Button variant="text" size="small" icon={<UndoIcon />}
          onClick={() => editor.chain().focus().undo().run()} title="撤销 (Ctrl+Z)" />
        <Button variant="text" size="small" icon={<RedoIcon />}
          onClick={() => editor.chain().focus().redo().run()} title="重做 (Ctrl+Y)" />

        <Divider layout="vertical" />

        {/* 字体族 */}
        <select
          className="toolbar-select toolbar-select--font"
          value={currentFontFamily}
          onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
          title="字体"
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* 字号 */}
        <select
          className="toolbar-select toolbar-select--size"
          value={currentFontSize}
          onChange={e =>
            e.target.value
              ? editor.chain().focus().setFontSize(e.target.value).run()
              : editor.chain().focus().unsetFontSize().run()
          }
          title="字号"
        >
          <option value="">字号</option>
          {FONT_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <Divider layout="vertical" />

        {/* 粗体 斜体 下划线 删除线 */}
        <Button
          variant={editor.isActive('bold') ? 'base' : 'text'}
          theme={editor.isActive('bold') ? 'primary' : 'default'}
          size="small" icon={<FormatBoldIcon />}
          onClick={() => editor.chain().focus().toggleBold().run()} title="加粗 (Ctrl+B)"
        />
        <Button
          variant={editor.isActive('italic') ? 'base' : 'text'}
          theme={editor.isActive('italic') ? 'primary' : 'default'}
          size="small" icon={<FormatItalicIcon />}
          onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体 (Ctrl+I)"
        />
        <Button
          variant={editor.isActive('underline') ? 'base' : 'text'}
          theme={editor.isActive('underline') ? 'primary' : 'default'}
          size="small" icon={<FormatUnderlineIcon />}
          onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线 (Ctrl+U)"
        />
        <Button
          variant={editor.isActive('strike') ? 'base' : 'text'}
          theme={editor.isActive('strike') ? 'primary' : 'default'}
          size="small" icon={<FormatStrikethroughIcon />}
          onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线"
        />

        {/* 文字颜色 */}
        <div className="toolbar-color-btn" title="文字颜色">
          <button
            className="toolbar-color-trigger"
            onClick={() => colorInputRef.current?.click()}
          >
            <span className="toolbar-color-letter">A</span>
            <span
              className="toolbar-color-bar"
              style={{ background: textColor }}
            />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={textColor}
            className="toolbar-color-input"
            onChange={e => {
              setTextColor(e.target.value);
              editor.chain().focus().setColor(e.target.value).run();
            }}
          />
        </div>

        {/* 高亮 */}
        <div ref={highlightRef} className="toolbar-highlight-wrap" title="文字高亮">
          <button
            className={`toolbar-highlight-trigger${editor.isActive('highlight') ? ' is-active' : ''}`}
            onClick={() => setShowHighlightPicker(v => !v)}
          >
            <span className="toolbar-hl-icon">M</span>
          </button>
          {showHighlightPicker && (
            <div className="toolbar-highlight-picker">
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.value}
                  className="toolbar-hl-swatch"
                  style={{ background: c.value }}
                  title={c.label}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: c.value }).run();
                    setShowHighlightPicker(false);
                  }}
                />
              ))}
              <button
                className="toolbar-hl-swatch toolbar-hl-none"
                title="取消高亮"
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 清除格式 */}
        <Button variant="text" size="small" icon={<FormatClearIcon />}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="清除格式" />

        <Divider layout="vertical" />

        {/* 标题 */}
        {([1, 2, 3] as const).map(level => (
          <Button
            key={level}
            variant={editor.isActive('heading', { level }) ? 'base' : 'text'}
            theme={editor.isActive('heading', { level }) ? 'primary' : 'default'}
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            title={`${level === 1 ? '一' : level === 2 ? '二' : '三'}级标题`}
          >
            H{level}
          </Button>
        ))}
        <Button variant="text" size="small"
          onClick={() => editor.chain().focus().setParagraph().run()} title="正文">
          ¶
        </Button>

        <Divider layout="vertical" />

        {/* 对齐 */}
        {(
          [
            { align: 'left', icon: <AlignLeftIcon />, label: '左对齐' },
            { align: 'center', icon: <AlignCenterIcon />, label: '居中' },
            { align: 'right', icon: <AlignRightIcon />, label: '右对齐' },
          ] as const
        ).map(({ align, icon, label }) => (
          <Button
            key={align}
            variant={editor.isActive({ textAlign: align }) ? 'base' : 'text'}
            theme={editor.isActive({ textAlign: align }) ? 'primary' : 'default'}
            size="small" icon={icon}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
            title={label}
          />
        ))}

        <Divider layout="vertical" />

        {/* 列表 引用 代码块 */}
        <Button
          variant={editor.isActive('bulletList') ? 'base' : 'text'}
          theme={editor.isActive('bulletList') ? 'primary' : 'default'}
          size="small" icon={<FormatListBulletedIcon />}
          onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表"
        />
        <Button
          variant={editor.isActive('orderedList') ? 'base' : 'text'}
          theme={editor.isActive('orderedList') ? 'primary' : 'default'}
          size="small" icon={<FormatListNumberedIcon />}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表"
        />
        <Button
          variant={editor.isActive('blockquote') ? 'base' : 'text'}
          theme={editor.isActive('blockquote') ? 'primary' : 'default'}
          size="small" icon={<FormatQuoteIcon />}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用"
        />
        <Button
          variant={editor.isActive('codeBlock') ? 'base' : 'text'}
          theme={editor.isActive('codeBlock') ? 'primary' : 'default'}
          size="small" icon={<CodeIcon />}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="代码块"
        />

        <Divider layout="vertical" />

        {/* 插入 */}
        <Button variant="text" size="small" icon={<ImageIcon />}
          onClick={handleImageUpload} title="插入图片" />
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handleFileChange} />
        <Button variant="text" size="small" icon={<TableIcon />}
          onClick={addTable} title="插入表格" />
        <Button variant="text" size="small" icon={<FormatHorizontalRuleIcon />}
          onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线" />
      </div>

      {/* ── 页面视图编辑区 ───────────────────────────────────────────────── */}
      <div className="rich-editor-body">
        <EditorContent editor={editor} />
      </div>

      {/* ── 表格快捷操作栏 ───────────────────────────────────────────────── */}
      {editor.isActive('table') && (
        <div className="rich-editor-table-actions">
          <Space size={4}>
            {[
              { label: '前插列', cmd: () => editor.chain().focus().addColumnBefore().run() },
              { label: '后插列', cmd: () => editor.chain().focus().addColumnAfter().run() },
              { label: '前插行', cmd: () => editor.chain().focus().addRowBefore().run() },
              { label: '后插行', cmd: () => editor.chain().focus().addRowAfter().run() },
              { label: '删除表格', cmd: () => editor.chain().focus().deleteTable().run(), danger: true },
            ].map(({ label, cmd, danger }) => (
              <Button key={label} size="small" variant="outline"
                theme={danger ? 'danger' : 'default'} onClick={cmd}>
                {label}
              </Button>
            ))}
          </Space>
        </div>
      )}

      {/* ── 状态栏：字数统计 ─────────────────────────────────────────────── */}
      <div className="rich-editor-statusbar">
        <span>字数：{charCount.toLocaleString()}</span>
        <span style={{ marginLeft: 16 }}>词数：{wordCount.toLocaleString()}</span>
      </div>
    </div>
  );
}
