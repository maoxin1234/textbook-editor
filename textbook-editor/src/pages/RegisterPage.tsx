import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input, MessagePlugin } from 'tdesign-react';
import { BookIcon } from 'tdesign-icons-react';
import { saveAuth } from '../utils/auth';
import { loadAISettings } from '../store/settings';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleRegister() {
    if (!form.username || !form.email || !form.password) {
      MessagePlugin.warning('请填写完整信息'); return;
    }
    if (form.password !== form.confirm) {
      MessagePlugin.warning('两次密码不一致'); return;
    }
    if (form.password.length < 6) {
      MessagePlugin.warning('密码至少 6 位'); return;
    }
    setLoading(true);
    try {
      const { backendUrl } = loadAISettings();
      const resp = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        MessagePlugin.error(err.detail || '注册失败');
        return;
      }
      const data = await resp.json();
      saveAuth(data.access_token, data.user);
      MessagePlugin.success('注册成功，欢迎！');
      navigate('/');
    } catch {
      MessagePlugin.error('无法连接到后端，请确认后端已启动');
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; placeholder: string; type: 'text' | 'password' }[] = [
    { key: 'username', label: '用户名', placeholder: '3-64 个字符', type: 'text' },
    { key: 'email', label: '邮箱', placeholder: 'your@email.com', type: 'text' },
    { key: 'password', label: '密码', placeholder: '至少 6 位', type: 'password' },
    { key: 'confirm', label: '确认密码', placeholder: '再输一次密码', type: 'password' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f5',
    }}>
      <Card style={{ width: 400, padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BookIcon size="40px" style={{ color: '#0052d9' }} />
          <h2 style={{ margin: '8px 0 4px', fontSize: 22 }}>创建账号</h2>
          <p style={{ color: '#999', margin: 0, fontSize: 13 }}>开始你的书籍创作</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{f.label}</label>
              <Input
                type={f.type}
                value={form[f.key]}
                onChange={v => set(f.key, v as string)}
                placeholder={f.placeholder}
                size="large"
                onEnter={handleRegister}
              />
            </div>
          ))}
          <Button
            theme="primary"
            size="large"
            block
            loading={loading}
            onClick={handleRegister}
            style={{ marginTop: 4 }}
          >
            注册
          </Button>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 13, margin: 0 }}>
            已有账号？{' '}
            <Link to="/login" style={{ color: '#0052d9' }}>立即登录</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
