import { useState, useEffect, useMemo, useCallback } from 'react';
import { crystals as crystalsApi, kits as kitsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import CrystalCard from '../components/CrystalCard';
import CrystalForm from '../components/CrystalForm';

export default function Dashboard() {
  const { user } = useAuth();
  const [crystals, setCrystals] = useState([]);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notification, setNotification] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, kData] = await Promise.all([crystalsApi.list(), kitsApi.list()]);
      setCrystals(cData);
      setKits(kData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 2500);
  };

  const filtered = useMemo(() => {
    if (!search) return crystals;
    const s = search.toLowerCase();
    return crystals.filter(c =>
      c.protein_name.toLowerCase().includes(s) ||
      (c.owner_name && c.owner_name.toLowerCase().includes(s)) ||
      (c.kit_name && c.kit_name.toLowerCase().includes(s)) ||
      (c.condition_text && c.condition_text.toLowerCase().includes(s)) ||
      (c.notes && c.notes.toLowerCase().includes(s))
    );
  }, [crystals, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = {};
    filtered.forEach(c => {
      const key = groupBy === 'protein' ? c.protein_name : (c.owner_name || 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filtered, groupBy]);

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try { await crystalsApi.delete(id); notify('已删除'); load(); }
    catch (e) { notify(e.message, false); }
  };

  const handleEdit = (crystal) => { setEditing(crystal); setShowForm(true); };

  const handleFormClose = () => { setShowForm(false); setEditing(null); };

  const handleFormSaved = () => { handleFormClose(); load(); notify(editing ? '修改成功' : '保存成功'); };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportComposite = async () => {
    const selected = crystals.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;

    // Create composite canvas image
    const cards = await Promise.all(selected.map(c => generateCardCanvas(c)));
    const canvas = document.createElement('canvas');
    const padding = 40;
    const cols = Math.min(selected.length, 3);
    const rows = Math.ceil(selected.length / cols);
    const cardW = 800, gap = 30;
    let cardH = 500;

    canvas.width = padding * 2 + cols * cardW + (cols - 1) * gap;
    canvas.height = padding * 2 + rows * cardH + (rows - 1) * gap + 60;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, canvas.width, 80);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('CrystalLog Report', canvas.width / 2, 52);

    // 由于 Canvas 生成卡片太复杂，这里直接导出为 JSON 或 HTML table
    // 改为下载多个单独的图片或使用简单的网格布局

    // Simple approach: download as JSON with export info
    const json = selected.map(c => ({
      protein: c.protein_name,
      owner: c.owner_name,
      kit: c.kit_name,
      well: c.well_id,
      condition: c.condition_text,
      method: c.method,
      notes: c.notes,
      date: c.created_at,
    }));

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crystal_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`已导出 ${selected.length} 条记录`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-lg text-white text-sm animate-fade-in ${notification.ok ? 'bg-slate-800' : 'bg-red-500'}`}>{notification.msg}</div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <input type="text" placeholder="搜索蛋白、条件、人员..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <svg className="absolute left-3 top-3 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shrink-0">
          <span className="text-xs text-slate-500 font-medium">分组:</span>
          {['none', 'protein', 'owner'].map(g => (
            <button key={g} onClick={() => setGroupBy(g)} className={`px-3 py-1 text-xs rounded-lg ${groupBy === g ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500'}`}>{g === 'none' ? '无' : g === 'protein' ? '蛋白' : '人员'}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center gap-1.5 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新建记录
        </button>
      </div>

      {/* Crystal list */}
      {grouped ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([name, items]) => (
            <div key={name}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{name}</h3>
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(c => <CrystalCard key={c.id} crystal={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onEdit={handleEdit} onDelete={handleDelete} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => <CrystalCard key={c.id} crystal={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onEdit={handleEdit} onDelete={handleDelete} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4">🧪</div>
            <p className="text-lg font-medium">暂无结晶数据</p>
            <p className="text-sm mt-1">点击"新建记录"开始录入</p>
          </div>
        )
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-5 animate-slide-up">
          <span className="text-sm font-medium">已选 {selectedIds.size} 项</span>
          <button onClick={handleExportComposite} className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full font-medium">导出</button>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-slate-700 rounded-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <CrystalForm crystal={editing} kits={kits} onClose={handleFormClose} onSaved={handleFormSaved} />
      )}
    </div>
  );
}

// Helper: generate card canvas for export
async function generateCardCanvas(crystal) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = 800, pad = 30;
  canvas.width = w;

  // Calculate height
  let h = 250;
  if (crystal.image_path) h += 300;
  if (crystal.condition_text) h += Math.ceil(crystal.condition_text.length / 50) * 30;
  canvas.height = h;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.roundRect(15, 15, w - 30, 80, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(crystal.protein_name, 40, 50);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#dbeafe';
  ctx.fillText(`${new Date(crystal.created_at).toLocaleDateString()} | ${crystal.owner_name || ''}`, 40, 78);

  let y = 120;

  // Image
  if (crystal.image_path) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = crystal.image_path.startsWith('http') ? crystal.image_path : `/${crystal.image_path}`;
      });
      if (img.width > 0) {
        const iw = w - 60, ih = 250;
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath(); ctx.roundRect(pad, y, iw, ih, 8); ctx.fill();
        ctx.drawImage(img, pad, y, iw, ih);
        y += ih + 20;
      }
    } catch {}
  }

  // Kit & Well badge
  if (crystal.kit_name || crystal.well_id) {
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath(); ctx.roundRect(pad, y, w - 60, 44, 8); ctx.fill();
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${crystal.kit_name || ''}  ${crystal.well_id || ''}`, pad + 15, y + 30);
    y += 65;
  }

  // Condition
  if (crystal.condition_text) {
    ctx.fillStyle = '#334155';
    ctx.font = '17px sans-serif';
    const words = crystal.condition_text.split('; ');
    let lineY = y;
    const maxW = w - 60;
    for (const word of words) {
      ctx.fillText(word, pad, lineY + 20);
      lineY += 28;
    }
    y = lineY + 10;
  }

  // Notes
  if (crystal.notes) {
    ctx.fillStyle = '#d97706';
    ctx.font = '15px sans-serif';
    ctx.fillText(`备注: ${crystal.notes}`, pad, y + 16);
  }

  return canvas;
}
