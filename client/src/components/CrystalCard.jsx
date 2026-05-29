export default function CrystalCard({ crystal, selected, onToggle, onEdit, onDelete }) {
  const imageUrl = crystal.image_path
    ? (crystal.image_path.startsWith('http') ? crystal.image_path : `/${crystal.image_path}`)
    : null;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer group relative overflow-hidden ${selected ? 'border-blue-500 ring-1 ring-blue-400' : 'border-slate-200 hover:shadow-md'}`}
      onClick={() => onToggle(crystal.id)}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-slate-100 relative">
        {imageUrl ? (
          <img src={imageUrl} alt={crystal.protein_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit(crystal); }} className="bg-white/90 p-1.5 rounded-lg text-slate-600 hover:text-blue-600 shadow-sm" title="编辑">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(crystal.id); }} className="bg-white/90 p-1.5 rounded-lg text-slate-600 hover:text-red-500 shadow-sm" title="删除">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
        {/* Selection indicator */}
        <div className="absolute top-2 left-2">
          {selected ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#2563eb" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <div className="w-[22px] h-[22px] rounded-full border-2 border-white/70 bg-black/15"></div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{crystal.protein_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{crystal.owner_name || 'Unknown'}</p>
          </div>
          {crystal.well_id && <span className="bg-slate-100 text-slate-600 text-xs font-mono font-bold px-1.5 py-0.5 rounded border">{crystal.well_id}</span>}
        </div>

        {crystal.condition_text && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-2">{crystal.condition_text}</p>
        )}

        {crystal.kit_name && (
          <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block max-w-full truncate mb-2">{crystal.kit_name}</div>
        )}

        {crystal.notes && (
          <div className="bg-amber-50 text-amber-800 text-[10px] p-1.5 rounded line-clamp-2 mb-2">{crystal.notes}</div>
        )}

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
          <span>{new Date(crystal.created_at).toLocaleDateString()}</span>
          <span>{crystal.method || 'Sitting Drop'}</span>
        </div>
      </div>
    </div>
  );
}
