import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdOk, setPwdOk] = useState('');

  const handleChangePwd = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdOk('');
    if (!oldPwd || !newPwd) { setPwdError('请填写所有字段'); return; }
    if (newPwd.length < 4) { setPwdError('新密码至少4位'); return; }
    try {
      await auth.changePassword({ old_password: oldPwd, new_password: newPwd });
      setPwdOk('密码修改成功');
      setTimeout(() => { setShowPwd(false); setPwdOk(''); setOldPwd(''); setNewPwd(''); }, 1500);
    } catch (e) { setPwdError(e.message || '修改失败'); }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
                  <polygon points="18,2 34,12 34,28 18,34 2,28 2,12" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
                  <polygon points="18,6 31,14 31,26 18,31 5,26 5,14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <line x1="18" y1="2" x2="5" y2="14" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <line x1="18" y1="2" x2="31" y2="14" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <line x1="18" y1="34" x2="5" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <line x1="18" y1="34" x2="31" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-800">CrystalLog</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link to="/" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>结晶记录</Link>
              {user.role === 'admin' && (
                <>
                  <Link to="/kits" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/kits' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>试剂盒库</Link>
                  <Link to="/users" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${location.pathname === '/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>用户管理</Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user.display_name} <span className="text-xs text-slate-400">({user.role === 'admin' ? '管理员' : '用户'})</span></span>
            <button onClick={() => setShowPwd(true)} className="text-sm text-slate-400 hover:text-blue-500">修改密码</button>
            <button onClick={logout} className="text-sm text-slate-400 hover:text-red-500">退出</button>
          </div>
        </div>
      </header>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-6 pb-16">
          <Outlet />
        </main>
        <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 text-center text-[11px] text-slate-400">
            <div>State Key Laboratory of Chemical Biology</div>
            <div>Shanghai Institute of Organic Chemistry, CAS</div>
            <div>&copy; 2026 TT Lab. All Rights Reserved. &nbsp;|&nbsp; Website developed by Liuzhen.</div>
          </div>
        </footer>
      </div>

      {/* Change Password Modal */}
      {showPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowPwd(false); setPwdError(''); setPwdOk(''); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800">修改密码</h3>
              <button onClick={() => { setShowPwd(false); setPwdError(''); setPwdOk(''); }} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleChangePwd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">旧密码</label>
                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">新密码</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              {pwdError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{pwdError}</div>}
              {pwdOk && <div className="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg">{pwdOk}</div>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm">确认修改</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
