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
