import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input, MessagePlugin } from 'tdesign-react';
import { BookIcon } from 'tdesign-icons-react';
import { saveAuth } from '../utils/auth';
import { loadAISettings } from '../store/settings';


export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) { MessagePlugin.warning('请输入用户名和密码'); return; }
    setLoading(true);
    try {
      const { backendUrl } = loadAISettings();
      const resp = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        MessagePlugin.error(err.detail || '登录失败');
        return;
      }
      const data = await resp.json();
      saveAuth(data.access_token, data.user);
      navigate('/');
    } catch {
      MessagePlugin.error('无法连接到后端，请确认后端已启动');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f5',
    }}>
      <Card style={{ width: 400, padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BookIcon size="40px" style={{ color: '#0052d9' }} />
          <h2 style={{ margin: '8px 0 4px', fontSize: 22 }}>书籍编写平台</h2>
          <p style={{ color: '#999', margin: 0, fontSize: 13 }}>登录你的账号</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>用户名</label>
            <Input
              value={username}
              onChange={v => setUsername(v as string)}
              placeholder="请输入用户名"
              size="large"
              onEnter={handleLogin}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>密码</label>
            <Input
              type="password"
              value={password}
              onChange={v => setPassword(v as string)}
              placeholder="请输入密码"
              size="large"
              onEnter={handleLogin}
            />
          </div>
          <Button
            theme="primary"
            size="large"
            block
            loading={loading}
            onClick={handleLogin}
            style={{ marginTop: 4 }}
          >
            登录
          </Button>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 13, margin: 0 }}>
            还没有账号？{' '}
            <Link to="/register" style={{ color: '#0052d9' }}>立即注册</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
