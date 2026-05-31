# 书籍编写平台 | Textbook Editor

> 一款面向中文书籍、教材、技术文档的本地优先编写工具，内置多模型 AI 写作助手。  
> A local-first book writing tool for Chinese textbooks and technical documents, with multi-model AI writing assistant.

---

## 截图 | Screenshots

*章节树 + Word 风格页面视图 + AI 写作助手面板*  
*Chapter tree · Word-style page view · AI writing assistant panel*

---

## 功能特性 | Features

### 用户系统 | User System
| 功能 | Feature |
|------|---------|
| 注册 / 登录，JWT 鉴权（7天有效期） | Register / login with JWT authentication |
| 数据存储在 PostgreSQL，支持多设备访问 | Data in PostgreSQL, accessible from any device |
| 每个用户的项目完全隔离 | Complete data isolation per user |

### RAG 写作增强 | RAG Writing Enhancement
| 功能 | Feature |
|------|---------|
| 上传参考资料（PDF / DOCX / TXT / MD） | Upload reference documents |
| 自动分块 + 本地 ONNX 嵌入（无需额外 API Key） | Auto-chunking + local ONNX embedding (no extra API key) |
| ChromaDB 向量存储，按项目隔离 | ChromaDB vector store, isolated per project |
| AI 对话时一键启用 RAG，自动检索相关段落注入上下文 | One-click RAG toggle in AI panel, auto-retrieves relevant chunks |

### 编辑器 | Editor
| 功能 | Feature |
|------|---------|
| Word 风格页面视图（A4 白纸 + 灰色背景） | Word-style page view (A4 white page on grey canvas) |
| 字体族、字号、文字颜色、高亮 | Font family, font size, text color, highlight |
| 粗体、斜体、下划线、删除线 | Bold, italic, underline, strikethrough |
| 一至三级标题 | Heading levels 1–3 |
| 左 / 居中 / 右对齐 | Left / center / right alignment |
| 有序列表、无序列表 | Ordered and unordered lists |
| 引用块、代码块 | Blockquote and code block |
| 图片插入（支持 Base64 内嵌） | Image insertion (Base64 inline) |
| 可调整列宽的表格 | Resizable tables |
| 字数 / 词数统计状态栏 | Character & word count status bar |

### 项目管理 | Project Management
| 功能 | Feature |
|------|---------|
| 多书籍项目管理 | Multiple book project management |
| 章 / 节 / 小节三级结构，自动编号 | Three-level hierarchy (章/节/小节) with auto-numbering |
| 章节搜索过滤 | Chapter search & filter |
| 拖拽排序（同级） | Drag-and-drop reordering (same level) |
| 删除确认保护 | Delete confirmation guard |
| 800ms 防抖自动保存 | 800 ms debounced auto-save |
| PostgreSQL 持久化，支持多设备访问 | PostgreSQL persistence, multi-device access |

### 导出 | Export
| 格式 | Format | 说明 | Notes |
|------|--------|------|-------|
| Markdown `.md` | Markdown `.md` | 纯前端，无需后端 | Frontend only |
| HTML `.html` | HTML `.html` | 保留完整样式 | Full styling |
| Word `.docx` | Word `.docx` | 需 Python 后端，格式完整还原 | Requires backend |
| PDF `.pdf` | PDF `.pdf` | 需 Python 后端，WeasyPrint 渲染 | Requires backend |

### AI 写作助手 | AI Writing Assistant
支持 8 个提供商，国产模型全面适配：  
Supports 8 providers with comprehensive support for Chinese LLMs:

| 提供商 | Provider | 代表模型 | Key Models |
|--------|----------|---------|-----------|
| Anthropic Claude | Anthropic Claude | claude-opus-4-8 / claude-sonnet-4-6 | claude-opus-4-8 / claude-sonnet-4-6 |
| OpenAI | OpenAI | gpt-4.1 / o4-mini / o3 | gpt-4.1 / o4-mini / o3 |
| DeepSeek（深度求索） | DeepSeek | deepseek-v4-flash / deepseek-v4-pro | deepseek-v4-flash / deepseek-v4-pro |
| 通义千问（阿里云） | Qwen (Alibaba) | qwen3.7-max / qwen-max | qwen3.7-max / qwen-max |
| Moonshot Kimi（月之暗面） | Moonshot Kimi | kimi-k2-6 / kimi-k2-5 | kimi-k2-6 / kimi-k2-5 |
| 智谱 GLM | Zhipu GLM | glm-5.1 / glm-5 / glm-4.7 | glm-5.1 / glm-5 / glm-4.7 |
| MiniMax | MiniMax | MiniMax-Text-01 | MiniMax-Text-01 |
| 文心（百度） | ERNIE (Baidu) | ernie-5.0-8k / ernie-x1-turbo-32k | ernie-5.0-8k / ernie-x1-turbo-32k |

内置快捷操作：**续写 · 润色 · 摘要 · 扩写** + 自定义指令，SSE 流式输出。  
Built-in quick actions: **Continue · Polish · Summarize · Expand** + custom prompt, SSE streaming output.

---

## 快速开始 | Quick Start

### 前置要求 | Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- PostgreSQL ≥ 14（用于用户数据持久化 | For user data persistence）

### 前端 | Frontend

```bash
cd textbook-editor
npm install
npm run dev
```

访问 / Open: `http://localhost:5173`

### 数据库 | Database

```sql
-- PostgreSQL 中创建数据库（首次使用）
CREATE DATABASE textbook_editor;
```

复制配置文件并填写数据库连接信息：  
Copy the config file and fill in your database credentials:

```bash
cp backend/.env.example backend/.env
# 编辑 DATABASE_URL 和 SECRET_KEY
```

### 后端 | Backend

```bash
cd backend

# 创建虚拟环境 | Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 安装依赖 | Install dependencies
pip install -r requirements.txt

# 启动 | Start
uvicorn main:app --reload
```

后端运行在 / Backend runs at: `http://localhost:8000`

**PDF 导出（Windows 额外步骤）| PDF Export on Windows**

WeasyPrint 需要 GTK3 运行库，Windows 默认不含此库：  
WeasyPrint requires GTK3 runtime libraries, which are not included on Windows by default:

1. 下载 GTK3 Runtime 安装包 / Download GTK3 Runtime:  
   👉 [GTK3 Runtime for Windows (GitHub Releases)](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases)  
   选择最新的 `gtk3-runtime-*-ts-win64.exe` / Pick the latest `gtk3-runtime-*-ts-win64.exe`
2. 安装时勾选 **"Set up PATH environment variable"**
3. 重启后端即可 / Restart the backend

macOS / Linux 无需额外操作 / macOS and Linux require no extra steps.

### 配置 API Key | Configure API Keys

1. 启动后端后，在前端侧边栏点击「**设置**」  
   After starting the backend, click **Settings** in the frontend sidebar
2. 输入后端地址并点击「测试连接」  
   Enter the backend URL and click "Test Connection"
3. 为你常用的模型提供商填入 API Key  
   Enter API Keys for your preferred providers
4. 选择默认提供商和模型，保存  
   Select the default provider and model, then save

---

## 技术栈 | Tech Stack

### 前端 | Frontend
- **React 19** + **TypeScript**
- **Vite 8** — 构建工具 | Build tool
- **TDesign React** — UI 组件库 | UI component library
- **TipTap 3** — 富文本编辑器内核 | Rich text editor core
- **React Router 7** — 路由 | Routing

### 后端 | Backend
- **FastAPI** — Web 框架 | Web framework
- **SQLAlchemy 2.0 (async)** + **asyncpg** — 异步 ORM + PostgreSQL | Async ORM + PostgreSQL
- **python-jose** + **passlib[bcrypt]** — JWT 鉴权 + 密码哈希 | JWT auth + password hashing
- **ChromaDB** — 向量数据库（本地持久化）| Vector database (local persistence)
- **pypdf** + **python-docx** — 文档解析 | Document parsing for RAG
- **python-docx** + **WeasyPrint** — Word / PDF 导出 | Word / PDF export
- **openai SDK** — OpenAI 兼容模型统一接入 | Unified OpenAI-compatible model access
- **anthropic SDK** — Claude 模型接入 | Claude model access
- **httpx** — 百度文心一言异步请求 | Async requests for Baidu ERNIE

---

## 项目结构 | Project Structure

```
.
├── textbook-editor/          # 前端 | Frontend (React + Vite)
│   ├── src/
│   │   ├── components/       # 编辑器、AI 面板、RAG 面板 | Editor, AI & RAG panels
│   │   ├── extensions/       # TipTap 自定义扩展（字号）| Custom TipTap extensions
│   │   ├── hooks/            # useDebounce
│   │   ├── pages/            # 登录、注册、首页、编辑器、设置 | Login, Register, Home, Editor, Settings
│   │   ├── store/            # API 数据层 + 设置管理 | API data layer + settings
│   │   ├── types/            # TypeScript 类型 | TypeScript types
│   │   └── utils/            # 导出工具、AI 流式调用、JWT | Export, AI stream, JWT auth
│   └── package.json
│
└── backend/                  # 后端 | Backend (Python + FastAPI)
    ├── main.py               # 应用入口，自动建表 | App entry, auto create tables
    ├── database.py           # SQLAlchemy 异步引擎 | Async SQLAlchemy engine
    ├── models.py             # ORM 模型：User / Project / Chapter / RagDocument
    ├── schemas.py            # Pydantic 请求/响应模型 | Request & response schemas
    ├── deps.py               # JWT 鉴权依赖 | JWT auth dependency
    ├── providers/            # AI 模型适配层 | AI model adapters
    │   ├── openai_compat.py  # OpenAI 兼容（DeepSeek / Qwen / Kimi 等）
    │   ├── anthropic_provider.py
    │   ├── baidu.py          # 文心一言（独立鉴权）| ERNIE (custom auth)
    │   └── registry.py       # 模型注册表 | Model registry
    ├── routers/
    │   ├── auth.py           # 注册 / 登录 / 用户信息 | Register / login / me
    │   ├── projects.py       # 项目 CRUD | Project CRUD
    │   ├── chapters.py       # 章节 CRUD + 排序 | Chapter CRUD + reorder
    │   ├── rag.py            # 文档上传、向量化、检索 | Upload, embed, retrieve
    │   ├── ai.py             # SSE 流式对话 + RAG 注入 | SSE chat + RAG injection
    │   └── export.py         # Word / PDF 导出 | Word / PDF export
    └── requirements.txt
```

---

## 与同类工具对比 | Comparison

| | 本项目 | GitBook | BookStack | Bibisco |
|--|--------|---------|-----------|---------|
| 用户注册 / 多设备访问 | ✅ JWT + PostgreSQL | ✅ SaaS | ✅ 自托管 | ❌ 本地 |
| 国产 AI 模型支持 | ✅ 8 个 | ❌ | ❌ | ❌ |
| RAG 参考资料增强 | ✅ ChromaDB | ❌ | ❌ | ❌ |
| Word / PDF 导出 | ✅ | ⚠️ 付费 | ⚠️ 有限 | ✅ |
| Web 界面 | ✅ | ✅ | ✅ | ❌ 桌面端 |
| 免费开源 / 可自托管 | ✅ | ❌ | ✅ | ✅ |

---

## 已知限制 | Known Limitations

| 限制 | Limitation |
|------|-----------|
| 暂无版本历史 / 快照功能 | No version history or snapshots |
| 仅支持单人使用，无协同编辑 | Single-user only, no real-time collaboration |
| 拖拽排序仅限同级节点 | Drag-and-drop reordering limited to same-level nodes |
| PDF 导出在 Windows 需额外安装 GTK3 | PDF export on Windows requires GTK3 runtime |
| RAG 嵌入模型首次使用需下载 ~90MB ONNX 模型 | RAG embedding model requires ~90 MB ONNX download on first use |

---

## 贡献 | Contributing

欢迎提交 Issue 和 Pull Request。  
Issues and pull requests are welcome.

在提 PR 之前请确保：/ Before submitting a PR, please ensure:
- `cd textbook-editor && npm run build` 无报错 | builds without errors
- 后端 `python -c "from routers import export, ai"` 正常导入 | backend imports successfully

---

## 开源协议 | License

[MIT License](LICENSE)
