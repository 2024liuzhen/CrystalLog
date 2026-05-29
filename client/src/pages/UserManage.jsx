import { useState, useEffect, useCallback } from 'react';
import { auth } from '../api';

export default function UserManage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await auth.users()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 2500);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', display_name: '', role: 'user' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, password: '', display_name: user.display_name, role: user.role });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingUser(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.display_name) { setError('请填写显示名称'); return; }
    if (!editingUser && (!form.username || !form.password)) { setError('请填写用户名和密码'); return; }

    try {
      if (editingUser) {
        const body = { display_name: form.display_name, role: form.role };
        if (form.password) body.password = form.password;
        if (form.username !== editingUser.username) body.username = form.username;
        await auth.updateUser(editingUser.id, body);
        notify('修改成功');
      } else {
        await auth.register({ username: form.username, password: form.password, display_name: form.display_name, role: form.role });
        notify('用户创建成功');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || '操作失败');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`确定删除用户"${user.display_name}"？`)) return;
    try {
      await auth.deleteUser(user.id);
      notify('已删除');
      load();
    } catch (err) {
      notify(err.message, false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-lg text-white text-sm animate-fade-in ${notification.ok ? 'bg-slate-800' : 'bg-red-500'}`}>{notification.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">用户管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理课题组账号</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 添加用户
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-5 py-3 text-left">用户名</th>
              <th className="px-5 py-3 text-left">显示名称</th>
              <th className="px-5 py-3 text-left">角色</th>
              <th className="px-5 py-3 text-left">创建时间</th>
              <th className="px-5 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-slate-700">{u.username}</td>
                <td className="px-5 py-3 text-slate-700">{u.display_name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-blue-600 p-1.5" title="编辑">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {u.id !== 1 && (
                      <button onClick={() => handleDelete(u)} className="text-slate-400 hover:text-red-500 p-1.5" title="删除">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeForm(); }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800">{editingUser ? '编辑用户' : '添加用户'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">用户名（英文）</label>
                <input type="text" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="e.g. zhangsan" autoFocus={!editingUser} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">显示名称</label>
                <input type="text" value={form.display_name} onChange={e => setForm(p => ({...p, display_name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="e.g. 张三" autoFocus={!!editingUser} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">密码{editingUser ? '（留空则不修改）' : ''}</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder={editingUser ? '留空保持原密码' : '设置密码'} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">角色</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm">
                {editingUser ? '保存修改' : '创建用户'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
