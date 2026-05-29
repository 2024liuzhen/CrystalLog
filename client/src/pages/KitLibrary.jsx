import { useState, useEffect, useCallback } from 'react';
import { kits as kitsApi } from '../api';

export default function KitLibrary() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [viewingKit, setViewingKit] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editKitId, setEditKitId] = useState(null);
  const [notification, setNotification] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setKits(await kitsApi.list()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await kitsApi.upload(files);
      setUploadResult(result);
      notify(`成功导入 ${result.totalSaved} 个试剂盒`);
      load();
    } catch (err) {
      notify(err.message, false);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`确定删除 "${name}"？`)) return;
    try { await kitsApi.delete(id); notify('已删除'); load(); }
    catch (e) { notify(e.message, false); }
  };

  const handleRename = async (id) => {
    if (!editingName.trim()) { setEditKitId(null); return; }
    try { await kitsApi.rename(id, editingName); notify('重命名成功'); setEditKitId(null); load(); }
    catch (e) { notify(e.message, false); }
  };

  const handleViewKit = async (id) => {
    try {
      const kit = await kitsApi.get(id);
      setViewingKit(kit);
    } catch (e) { notify(e.message, false); }
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
          <h1 className="text-xl font-bold text-slate-800">试剂盒库</h1>
          <p className="text-sm text-slate-500 mt-1">管理结晶筛选试剂盒，上传 Excel 自动解析条件</p>
        </div>
        <label className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          {uploading ? '解析中...' : '上传 Excel'}
          <input type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* Upload results */}
      {uploadResult && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-700 mb-2">导入结果</h3>
          <div className="space-y-1 text-sm">
            {uploadResult.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {r.success ? (
                  <span className="text-green-600">&#10003;</span>
                ) : (
                  <span className="text-red-500">&#10007;</span>
                )}
                <span className="text-slate-600">{r.file}</span>
                {r.success && r.kits && <span className="text-slate-400">→ {r.kits.map(k => k.skipped ? `${k.name}(已存在)` : `${k.name}(${k.count})`).join(', ')}</span>}
                {r.error && <span className="text-red-500 text-xs ml-auto">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kit list */}
      {kits.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg font-medium">暂无试剂盒</p>
          <p className="text-sm mt-1">上传 Excel 文件开始导入</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {kits.map(kit => (
            <div key={kit.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 transition-colors">
              <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{kit.condition_count}</div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewKit(kit.id)}>
                {editKitId === kit.id ? (
                  <div className="flex items-center gap-2">
                    <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="border border-blue-400 rounded px-2 py-1 text-sm outline-none flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleRename(kit.id); if (e.key === 'Escape') setEditKitId(null); }} />
                    <button onClick={() => handleRename(kit.id)} className="text-green-600 p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button>
                    <button onClick={() => setEditKitId(null)} className="text-slate-400 p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-slate-700 truncate">{kit.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{kit.condition_count} 个条件 · 创建于 {new Date(kit.created_at).toLocaleDateString()}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditKitId(kit.id); setEditingName(kit.name); }} className="text-slate-400 hover:text-blue-600 p-2" title="重命名">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => handleDelete(kit.id, kit.name)} className="text-slate-400 hover:text-red-500 p-2" title="删除">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kit detail modal */}
      {viewingKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setViewingKit(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{viewingKit.name}</h3>
              <button onClick={() => setViewingKit(null)} className="text-slate-400 hover:text-slate-600">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left w-16">孔号</th>
                    <th className="px-4 py-2.5 text-left">条件</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingKit.conditions.map(c => (
                    <tr key={c.well_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-500">{c.well_id}</td>
                      <td className="px-4 py-2 text-slate-700 text-xs leading-relaxed">{c.condition_text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
