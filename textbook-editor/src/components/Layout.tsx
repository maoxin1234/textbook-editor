import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'tdesign-react';
import { HomeIcon, BookIcon, SettingIcon } from 'tdesign-icons-react';
import 'tdesign-react/dist/tdesign.css';

const { Header, Content, Aside } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { value: '/', label: '项目列表', icon: <HomeIcon /> },
    { value: '/settings', label: '设置', icon: <SettingIcon /> },
  ];

  const isEditor = location.pathname.startsWith('/editor/');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #e7e7e7',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <BookIcon size="28px" style={{ color: '#0052d9' }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>书籍编写平台</span>
        </div>
        <div style={{ flex: 1 }} />
        {isEditor && (
          <span style={{ color: '#666', fontSize: 14 }}>正在编辑中...</span>
        )}
      </Header>
      <Layout>
        <Aside style={{ background: '#fff', borderRight: '1px solid #e7e7e7', width: 200 }}>
          <Menu
            value={location.pathname}
            style={{ height: '100%' }}
            onChange={value => navigate(value as string)}
          >
            {menuItems.map(item => (
              <Menu.MenuItem key={item.value} value={item.value} icon={item.icon}>
                {item.label}
              </Menu.MenuItem>
            ))}
          </Menu>
        </Aside>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
