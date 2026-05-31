import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  MessagePlugin,
  Tag,
  Divider,
} from 'tdesign-react';
import { loadAISettings, saveAISettings, loadAllCredentials, saveAllCredentials } from '../utils/api';

interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  key_fields: { key: string; label: string; secret: boolean }[];
}

export default function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('deepseek-chat');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [allCreds, setAllCreds] = useState<Record<string, Record<string, string>>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const s = loadAISettings();
    setBackendUrl(s.backendUrl);
    setProvider(s.provider);
    setModel(s.model);
    setAllCreds(loadAllCredentials());
    fetchProviders(s.backendUrl);
  }, []);

  async function fetchProviders(url: string) {
    try {
      const resp = await fetch(`${url}/ai/providers`);
      if (resp.ok) setProviders(await resp.json());
    } catch { /* backend not running yet */ }
  }

  const currentProvider = providers.find(p => p.id === provider);
  const modelOptions = (currentProvider?.models ?? []).map(m => ({ label: m, value: m }));

  function handleProviderChange(val: string) {
    setProvider(val);
    const p = providers.find(x => x.id === val);
    if (p?.models.length) setModel(p.models[0]);
  }

  function setCred(provId: string, key: string, value: string) {
    setAllCreds(prev => ({
      ...prev,
      [provId]: { ...(prev[provId] ?? {}), [key]: value },
    }));
  }

  function handleSave() {
    saveAISettings({ backendUrl, provider, model, credentials: {} });
    saveAllCredentials(allCreds);
    MessagePlugin.success('设置已保存');
  }

  async function handleTest() {
    setTesting(true);
    try {
      const resp = await fetch(`${backendUrl}/`);
      if (resp.ok) {
        MessagePlugin.success('后端连接成功');
        fetchProviders(backendUrl);
      } else {
        MessagePlugin.error('后端返回错误');
      }
    } catch {
      MessagePlugin.error('无法连接到后端，请确认已启动');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>设置</h2>

      {/* 后端连接 */}
      <Card title="后端服务" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={backendUrl}
            onChange={v => setBackendUrl(v as string)}
            placeholder="http://localhost:8000"
            style={{ flex: 1 }}
          />
          <Button variant="outline" onClick={handleTest} loading={testing}>
            测试连接
          </Button>
        </div>
        <p style={{ color: '#999', fontSize: 12, margin: '8px 0 0' }}>
          启动方式：进入 backend/ 目录，运行{' '}
          <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>
            uvicorn main:app --reload
          </code>
        </p>
      </Card>

      {/* 默认 AI 设置 */}
      <Card title="默认 AI 模型" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>提供商</label>
              <Select
                value={provider}
                onChange={v => handleProviderChange(v as string)}
                options={providers.map(p => ({ label: p.name, value: p.id }))}
                placeholder="选择提供商"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>模型</label>
              <Select
                value={model}
                onChange={v => setModel(v as string)}
                options={modelOptions}
                placeholder="选择模型"
                style={{ width: '100%' }}
                creatable
              />
            </div>
          </div>
          {providers.length === 0 && (
            <p style={{ color: '#faad14', fontSize: 12, margin: 0 }}>
              请先测试连接后端，成功后将自动加载可用模型列表。
            </p>
          )}
        </div>
      </Card>

      {/* 各提供商 API Key */}
      <Card title="API Key 配置">
        <p style={{ color: '#999', fontSize: 12, marginTop: 0, marginBottom: 16 }}>
          Key 仅存储在本地浏览器，随请求发往本地后端，不会上传到任何第三方服务器。
        </p>
        {providers.map((p, i) => (
          <div key={p.id}>
            {i > 0 && <Divider />}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                <Tag size="small" theme="default" variant="light">{p.id}</Tag>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.key_fields.map(field => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ width: 200, fontSize: 13, color: '#666', flexShrink: 0 }}>
                      {field.label}
                    </label>
                    <Input
                      type={field.secret ? 'password' : 'text'}
                      value={allCreds[p.id]?.[field.key] ?? ''}
                      onChange={v => setCred(p.id, field.key, v as string)}
                      placeholder={`输入 ${field.label}...`}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <p style={{ color: '#bbb', textAlign: 'center', padding: '16px 0' }}>
            连接后端后显示可用提供商列表
          </p>
        )}
      </Card>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button theme="primary" onClick={handleSave}>
          保存设置
        </Button>
      </div>
    </div>
  );
}
