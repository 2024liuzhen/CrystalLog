import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
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
            &copy; 2026 CrystalLog. Open source under MIT License.
          </div>
        </footer>
      </div>
    </div>
  );
}
