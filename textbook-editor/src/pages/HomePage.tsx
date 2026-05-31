import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Dialog,
  Input,
  Textarea,
  MessagePlugin,
  Empty,
  Popconfirm,
} from 'tdesign-react';
import { AddIcon, DeleteIcon } from 'tdesign-icons-react';
import { getProjects, createProject, deleteProject } from '../store';
import type { TextbookProject } from '../types';

export default function HomePage() {
  const [projects, setProjects] = useState<TextbookProject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    setProjects(await getProjects());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) { MessagePlugin.warning('请输入书籍名称'); return; }
    await createProject(newName.trim(), newDesc.trim());
    setNewName(''); setNewDesc('');
    setShowCreate(false);
    await refresh();
    MessagePlugin.success('创建成功！');
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    await refresh();
    MessagePlugin.success('已删除');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>我的书籍项目</h2>
        <Button theme="primary" icon={<AddIcon />} onClick={() => setShowCreate(true)}>
          新建书籍
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Empty description="还没有书籍项目，点击上方按钮创建一个吧！" />
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {projects.map(project => (
            <div key={project.id} onClick={() => navigate(`/editor/${project.id}`)} style={{ cursor: 'pointer' }}>
              <Card
                title={project.name}
                hoverShadow
                actions={
                  <div style={{ cursor: 'default' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Popconfirm
                      content="确定要删除这个书籍项目吗？所有章节内容将被一起删除，此操作不可恢复。"
                      onConfirm={() => handleDelete(project.id)}
                    >
                      <Button variant="text" theme="danger" icon={<DeleteIcon />} size="small" />
                    </Popconfirm>
                  </div>
                }
              >
                <p style={{ color: '#666', margin: '0 0 12px 0', minHeight: 40 }}>
                  {project.description || '暂无描述'}
                </p>
                <div style={{ fontSize: 12, color: '#999' }}>
                  创建于 {formatDate(project.createdAt)}
                  <br />
                  更新于 {formatDate(project.updatedAt)}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog
        header="新建书籍"
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onConfirm={handleCreate}
        confirmBtn="创建"
        cancelBtn="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>书籍名称 *</label>
            <Input
              placeholder="例如：产品设计手册"
              value={newName}
              onChange={v => setNewName(v as string)}
              onEnter={handleCreate}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>描述</label>
            <Textarea
              placeholder="简要描述书籍内容和用途..."
              value={newDesc}
              onChange={v => setNewDesc(v as string)}
              autosize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
