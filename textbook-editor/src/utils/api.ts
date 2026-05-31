/** 后端 API 工具函数 */

export interface AISettings {
  backendUrl: string;
  provider: string;
  model: string;
  credentials: Record<string, string>;
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem('ai_settings');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    backendUrl: 'http://localhost:8000',
    provider: 'deepseek',
    model: 'deepseek-chat',
    credentials: {},
  };
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem('ai_settings', JSON.stringify(settings));
}

/** 加载所有提供商的凭据（按 provider 分开存，避免互相覆盖）。 */
export function loadAllCredentials(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem('ai_credentials');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function saveAllCredentials(creds: Record<string, Record<string, string>>): void {
  localStorage.setItem('ai_credentials', JSON.stringify(creds));
}

// ─── 导出 API ─────────────────────────────────────────────────────────────────

export async function exportDocx(
  backendUrl: string,
  projectName: string,
  html: string
): Promise<void> {
  const resp = await fetch(`${backendUrl}/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_name: projectName, html }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const blob = await resp.blob();
  _downloadBlob(blob, `${projectName}.docx`);
}

export async function exportPdf(
  backendUrl: string,
  projectName: string,
  html: string
): Promise<void> {
  const resp = await fetch(`${backendUrl}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_name: projectName, html }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const blob = await resp.blob();
  _downloadBlob(blob, `${projectName}.pdf`);
}

function _downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── AI 流式对话 ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatStream(
  settings: AISettings,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const allCreds = loadAllCredentials();
  const credentials = {
    ...allCreds[settings.provider],
    ...settings.credentials,
  };

  const resp = await fetch(`${settings.backendUrl}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: settings.provider,
      model: settings.model,
      messages,
      credentials,
      stream: true,
    }),
    signal,
  });

  if (!resp.ok) {
    onError(`后端错误 ${resp.status}: ${await resp.text()}`);
    return;
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        onDone();
        return;
      }
      try {
        const data = JSON.parse(payload);
        if (data.error) {
          onError(data.error);
          return;
        }
        if (data.content) onChunk(data.content);
      } catch { /* skip malformed */ }
    }
  }
  onDone();
}
