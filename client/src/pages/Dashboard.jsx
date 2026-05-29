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

  const downloadCanvas = (canvas, filename) => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleExportSingle = async (crystal) => {
    const canvas = await drawCrystalCard(crystal);
    downloadCanvas(canvas, `${crystal.protein_name}_${crystal.well_id || 'N' + crystal.id}.png`);
    notify('已导出');
  };

  const handleExportComposite = async () => {
    const selected = crystals.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;

    if (selected.length === 1) {
      return handleExportSingle(selected[0]);
    }

    const cards = await Promise.all(selected.map(c => drawCrystalCard(c)));
    const pad = 30, gap = 20;
    const cardW = 800, titleH = 90, footerH = 20;
    const cardH = cards[0]?.height || 500;
    const cols = Math.min(selected.length, 2);
    const rows = Math.ceil(selected.length / cols);

    const canvas = document.createElement('canvas');
    canvas.width = pad * 2 + cols * cardW + (cols - 1) * gap;
    canvas.height = titleH + pad + rows * (cardH + gap) + footerH;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Title bar
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, canvas.width, titleH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CrystalLog Report - ${new Date().toLocaleDateString()}`, canvas.width / 2, 55);

    cards.forEach((card, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (cardW + gap);
      const y = titleH + pad + row * (cardH + gap);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(x - 3, y - 3, cardW + 6, cardH + 6, 12); ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 10;
      ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.drawImage(card, x, y);
    });

    downloadCanvas(canvas, `CrystalLog_export_${new Date().toISOString().split('T')[0]}.png`);
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
                {items.map(c => <CrystalCard key={c.id} crystal={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onEdit={handleEdit} onDelete={handleDelete} onExport={handleExportSingle} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => <CrystalCard key={c.id} crystal={c} selected={selectedIds.has(c.id)} onToggle={toggleSelect} onEdit={handleEdit} onDelete={handleDelete} onExport={handleExportSingle} />)}
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

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function drawCrystalCard(crystal) {
  const w = 800, pad = 24;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Measure text to calculate height
  let y = pad;
  y += 72; // header
  y += pad;

  // Image section
  let imgHeight = 0;
  if (crystal.image_path) { imgHeight = 260; y += imgHeight + pad; }

  // Kit & well
  if (crystal.kit_name || crystal.well_id) y += 48;

  // Condition
  let condLines = 0;
  if (crystal.condition_text) {
    ctx.font = '15px sans-serif';
    const parts = crystal.condition_text.split('; ');
    parts.forEach(p => { condLines += wrapText(ctx, p, w - pad * 2 - 15).length; });
    y += condLines * 22 + 10;
  }

  // Notes
  if (crystal.notes) { ctx.font = '13px sans-serif'; y += 24 + wrapText(ctx, crystal.notes, w - pad * 2).length * 20; }

  // Method & date footer
  y += 12 + 24;

  canvas.width = w; canvas.height = y + pad;

  // Start drawing
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(0, 0, w, canvas.height, 16); ctx.fill();

  y = pad;

  // Header with protein name
  ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.roundRect(pad, y, w - pad * 2, 72, 12); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(crystal.protein_name, pad + 20, y + 32);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#bfdbfe';
  const meta = `${new Date(crystal.created_at).toLocaleDateString()} | ${crystal.owner_name || ''} | ${crystal.method || 'Sitting Drop'}`;
  ctx.fillText(meta, pad + 20, y + 54);
  y += 72 + pad;

  // Image
  if (crystal.image_path) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res) => { img.onload = res; img.onerror = res; img.src = (crystal.image_path.startsWith('http') ? '' : '/') + crystal.image_path; });
      if (img.width > 0) {
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.roundRect(pad, y, w - pad * 2, imgHeight, 10); ctx.fill();
        ctx.drawImage(img, pad + 5, y + 5, w - pad * 2 - 10, imgHeight - 10);
        y += imgHeight + pad;
      }
    } catch { }
  }

  // Kit & well badge
  if (crystal.kit_name || crystal.well_id) {
    ctx.fillStyle = '#eff6ff'; ctx.beginPath(); ctx.roundRect(pad, y, w - pad * 2, 40, 8); ctx.fill();
    ctx.fillStyle = '#1e40af'; ctx.font = 'bold 15px sans-serif';
    const badge = [crystal.kit_name, crystal.well_id].filter(Boolean).join('  ');
    ctx.fillText(badge, pad + 15, y + 27);
    y += 48;
  }

  // Condition lines
  if (crystal.condition_text) {
    ctx.fillStyle = '#475569'; ctx.font = '15px sans-serif';
    const parts = crystal.condition_text.split('; ');
    parts.forEach(part => {
      const lines = wrapText(ctx, part, w - pad * 2 - 15);
      lines.forEach(line => {
        ctx.fillText(line, pad + 10, y + 18);
        y += 22;
      });
    });
    y += 10;
  }

  // Notes
  if (crystal.notes) {
    ctx.fillStyle = '#b45309'; ctx.font = '13px sans-serif';
    ctx.fillText('备注: ' + crystal.notes, pad + 5, y + 18);
    y += 30;
  }

  // Footer line
  y += 12;
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad + 10, y); ctx.lineTo(w - pad - 10, y); ctx.stroke();
  y += 4;
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif';
  ctx.fillText(`CrystalLog  ·  ${new Date(crystal.created_at).toLocaleDateString()}`, pad + 10, y + 14);

  return canvas;
}
