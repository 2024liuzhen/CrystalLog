import { useState, useEffect } from 'react';
import { crystals as crystalsApi } from '../api';

export default function CrystalForm({ crystal, kits, onClose, onSaved }) {
  const isEdit = !!crystal;
  const [form, setForm] = useState({
    protein_name: '',
    protein_conc: '',
    kit_id: '',
    well_id: '',
    method: 'Sitting Drop',
    protein_vol: 0.5,
    reservoir_vol_drop: 0.5,
    reservoir_vol_total: 60,
    notes: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conditionHint, setConditionHint] = useState('');

  useEffect(() => {
    if (crystal) {
      setForm({
        protein_name: crystal.protein_name || '',
        protein_conc: crystal.protein_conc || '',
        kit_id: crystal.kit_id || '',
        well_id: crystal.well_id || '',
        method: crystal.method || 'Sitting Drop',
        protein_vol: crystal.protein_vol || 0.5,
        reservoir_vol_drop: crystal.reservoir_vol_drop || 0.5,
        reservoir_vol_total: crystal.reservoir_vol_total || 60,
        notes: crystal.notes || '',
      });
      if (crystal.image_path) {
        setPreview(crystal.image_path.startsWith('http') ? crystal.image_path : `/${crystal.image_path}`);
      }
    }
  }, [crystal]);

  // Auto-lookup condition when kit or well changes
  useEffect(() => {
    if (form.kit_id && form.well_id) {
      crystalsApi.lookupCondition(form.kit_id, form.well_id).then(d => {
        setConditionHint(d.condition_text || '');
      }).catch(() => setConditionHint(''));
    } else {
      setConditionHint('');
    }
  }, [form.kit_id, form.well_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('图片太大'); return; }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.protein_name) { setError('请填写蛋白名称'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        protein_name: form.protein_name,
        protein_conc: form.protein_conc || undefined,
        kit_id: form.kit_id ? Number(form.kit_id) : undefined,
        well_id: form.well_id ? form.well_id.toUpperCase() : undefined,
        method: form.method,
        protein_vol: Number(form.protein_vol),
        reservoir_vol_drop: Number(form.reservoir_vol_drop),
        reservoir_vol_total: Number(form.reservoir_vol_total),
        notes: form.notes,
      };

      let saved;
      if (isEdit) {
        saved = await crystalsApi.update(crystal.id, payload);
      } else {
        saved = await crystalsApi.create(payload);
      }

      // Upload image if selected
      if (imageFile && saved) {
        await crystalsApi.uploadImage(saved.id || crystal?.id, imageFile);
      }

      onSaved();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const wellOptions = [];
  for (const row of 'ABCDEFGH') {
    for (let col = 1; col <= 12; col++) {
      wellOptions.push(row + col);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className={`px-6 py-4 border-b flex items-center gap-2 sticky top-0 bg-white z-10 ${isEdit ? 'bg-amber-50' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isEdit ? '#d97706' : '#2563eb'} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h2 className="font-bold text-slate-700 flex-1">{isEdit ? '编辑记录' : '新建结晶记录'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">蛋白名称 *</label>
              <input type="text" name="protein_name" required value={form.protein_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="e.g. BSA" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">浓度</label>
              <input type="text" name="protein_conc" value={form.protein_conc} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="e.g. 10 mg/mL" />
            </div>
          </div>

          {/* Kit + Well */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">试剂盒</label>
              <select name="kit_id" value={form.kit_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                <option value="">-- 选择 Kit --</option>
                {kits.map(k => <option key={k.id} value={k.id}>{k.name} ({k.condition_count} wells)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">孔号</label>
              <select name="well_id" value={form.well_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-mono">
                <option value="">-- 选择孔 --</option>
                {wellOptions.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Condition auto-fill */}
          {conditionHint && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
              <span className="font-semibold text-xs uppercase text-blue-500">自动匹配条件</span>
              <div className="mt-2 space-y-1.5">
                {conditionHint.split('; ').filter(Boolean).map((part, i) => {
                  const m = part.match(/^\[(.+?)\]\s*(.*)$/);
                  const label = m ? m[1] : '';
                  const content = m ? m[2] : part;
                  const colors = {
                    Salt: 'text-orange-700 bg-orange-50 border-orange-200',
                    Buffer: 'text-green-700 bg-green-50 border-green-200',
                    Precipitant: 'text-purple-700 bg-purple-50 border-purple-200',
                    Additive: 'text-cyan-700 bg-cyan-50 border-cyan-200',
                  };
                  const colorClass = Object.keys(colors).find(k => label.startsWith(k)) || '';
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 mt-0.5 font-medium ${colors[colorClass] || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                        {label}
                      </span>
                      <span className="text-blue-800">{content}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Method */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">结晶方法</span>
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
                {['Sitting Drop', 'Hanging Drop'].map(m => (
                  <button key={m} type="button" onClick={() => setForm(p => ({ ...p, method: m }))} className={`px-3 py-1 text-xs rounded-md ${form.method === m ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{m === 'Sitting Drop' ? '坐滴' : '悬滴'}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">蛋白液 (µL)</label>
                <input type="number" step="0.1" name="protein_vol" value={form.protein_vol} onChange={handleChange} className="w-full px-2 py-1.5 border rounded text-sm text-center" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">池液 (µL)</label>
                <input type="number" step="0.1" name="reservoir_vol_drop" value={form.reservoir_vol_drop} onChange={handleChange} className="w-full px-2 py-1.5 border rounded text-sm text-center" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">底池液 (µL)</label>
                <input type="number" step="1" name="reservoir_vol_total" value={form.reservoir_vol_total} onChange={handleChange} className="w-full px-2 py-1.5 border rounded text-sm text-center" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">备注</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="结晶形态、析出情况等..." />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">照片</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 relative h-36 flex items-center justify-center">
              <input type="file" accept="image/*" onChange={handleImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {preview ? (
                <div className="relative w-full h-full">
                  <img src={preview} alt="Preview" className="max-h-full mx-auto rounded object-contain" />
                  <button type="button" onClick={() => { setPreview(null); setImageFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div className="text-slate-400">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-xs">点击上传照片</span>
                </div>
              )}
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">取消</button>
            <button type="submit" disabled={submitting} className={`px-5 py-2.5 text-white rounded-lg text-sm font-medium flex items-center gap-2 ${isEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
              {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : null}
              {isEdit ? '保存修改' : '创建记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
