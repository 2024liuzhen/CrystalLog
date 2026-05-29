import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { get, all, run } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const router = Router();

const imageDir = path.join(DATA_DIR, 'images');
fs.mkdirSync(imageDir, { recursive: true });

const imageUpload = multer({
  dest: imageDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) cb(new Error('只允许图片文件'));
    else cb(null, true);
  }
});

// GET /api/crystals
router.get('/', authenticate, async (req, res) => {
  const { search, groupBy, userId } = req.query;

  let where = '';
  const params = [];

  if (req.user.role === 'admin' && userId) {
    where = 'WHERE c.user_id = ?';
    params.push(userId);
  } else if (req.user.role !== 'admin') {
    where = 'WHERE c.user_id = ?';
    params.push(req.user.id);
  }

  if (search) {
    const searchClause = '(c.protein_name LIKE ? OR c.condition_text LIKE ? OR c.notes LIKE ? OR u.display_name LIKE ? OR k.name LIKE ?)';
    const term = `%${search}%`;
    if (where) where += ' AND ' + searchClause;
    else where = 'WHERE ' + searchClause;
    params.push(term, term, term, term, term);
  }

  const crystals = all(`
    SELECT c.*, u.display_name as owner_name, k.name as kit_name
    FROM crystals c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN kits k ON c.kit_id = k.id
    ${where}
    ORDER BY c.created_at DESC
  `, params);

  res.json(crystals);
});

// GET /api/crystals/:id
router.get('/:id', authenticate, async (req, res) => {
  const crystal = get(`
    SELECT c.*, u.display_name as owner_name, k.name as kit_name
    FROM crystals c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN kits k ON c.kit_id = k.id
    WHERE c.id = ?
  `, [req.params.id]);
  if (!crystal) return res.status(404).json({ error: '记录不存在' });

  if (req.user.role !== 'admin' && crystal.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权访问' });
  }

  res.json(crystal);
});

// POST /api/crystals
router.post('/', authenticate, async (req, res) => {
  const { protein_name, protein_conc, kit_id, well_id, method, protein_vol, reservoir_vol_drop, reservoir_vol_total, notes } = req.body;

  if (!protein_name) return res.status(400).json({ error: '请填写蛋白名称' });

  let condition_text = '';
  if (kit_id && well_id) {
    const cond = get('SELECT condition_text FROM kit_conditions WHERE kit_id = ? AND well_id = ?', [kit_id, well_id.toUpperCase()]);
    if (cond) condition_text = cond.condition_text;
  }

  run(`
    INSERT INTO crystals (user_id, protein_name, protein_conc, kit_id, well_id, condition_text, method, protein_vol, reservoir_vol_drop, reservoir_vol_total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [req.user.id, protein_name, protein_conc || null, kit_id || null, well_id ? well_id.toUpperCase() : null, condition_text, method || 'Sitting Drop', protein_vol || 0.5, reservoir_vol_drop || 0.5, reservoir_vol_total || 60, notes || null]);

  const maxRow = get('SELECT MAX(id) as mid FROM crystals WHERE user_id = ?', [req.user.id]);
  const crystal = get('SELECT * FROM crystals WHERE id = ?', [maxRow.mid]);
  res.status(201).json(crystal);
});

// PUT /api/crystals/:id
router.put('/:id', authenticate, async (req, res) => {
  const crystal = get('SELECT * FROM crystals WHERE id = ?', [req.params.id]);
  if (!crystal) return res.status(404).json({ error: '记录不存在' });

  if (req.user.role !== 'admin' && crystal.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权修改' });
  }

  const { protein_name, protein_conc, kit_id, well_id, method, protein_vol, reservoir_vol_drop, reservoir_vol_total, notes } = req.body;

  let condition_text = crystal.condition_text;
  if (kit_id && well_id) {
    const cond = get('SELECT condition_text FROM kit_conditions WHERE kit_id = ? AND well_id = ?', [kit_id, well_id.toUpperCase()]);
    if (cond) condition_text = cond.condition_text;
  }

  run(`
    UPDATE crystals SET protein_name=?, protein_conc=?, kit_id=?, well_id=?, condition_text=?, method=?, protein_vol=?, reservoir_vol_drop=?, reservoir_vol_total=?, notes=?, updated_at=datetime('now')
    WHERE id=?
  `, [protein_name || crystal.protein_name, protein_conc || crystal.protein_conc, kit_id || crystal.kit_id, well_id ? well_id.toUpperCase() : crystal.well_id, condition_text, method || crystal.method, protein_vol ?? crystal.protein_vol, reservoir_vol_drop ?? crystal.reservoir_vol_drop, reservoir_vol_total ?? crystal.reservoir_vol_total, notes !== undefined ? notes : crystal.notes, req.params.id]);

  const updated = get('SELECT * FROM crystals WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE /api/crystals/:id
router.delete('/:id', authenticate, async (req, res) => {
  const crystal = get('SELECT * FROM crystals WHERE id = ?', [req.params.id]);
  if (!crystal) return res.status(404).json({ error: '记录不存在' });

  if (req.user.role !== 'admin' && crystal.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权删除' });
  }

  if (crystal.image_path) {
    const imgPath = path.join(DATA_DIR, crystal.image_path.replace(/^uploads\//, ''));
    try { fs.unlinkSync(imgPath); } catch {}
  }

  run('DELETE FROM crystals WHERE id = ?', [req.params.id]);
  res.json({ message: '删除成功' });
});

// POST /api/crystals/:id/image
router.post('/:id/image', authenticate, imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择图片' });

  const crystal = get('SELECT * FROM crystals WHERE id = ?', [req.params.id]);
  if (!crystal) return res.status(404).json({ error: '记录不存在' });

  if (req.user.role !== 'admin' && crystal.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权修改' });
  }

  if (crystal.image_path) {
    const oldPath = path.join(DATA_DIR, crystal.image_path.replace(/^uploads\//, ''));
    try { fs.unlinkSync(oldPath); } catch {}
  }

  const imagePath = 'uploads/images/' + req.file.filename;
  run('UPDATE crystals SET image_path=?, updated_at=datetime(\'now\') WHERE id=?', [imagePath, req.params.id]);

  res.json({ image_path: imagePath });
});

// GET /api/crystals/condition/lookup
router.get('/condition/lookup', authenticate, async (req, res) => {
  const { kit_id, well_id } = req.query;
  if (!kit_id || !well_id) return res.status(400).json({ error: '请提供 kit_id 和 well_id' });

  const cond = get('SELECT condition_text FROM kit_conditions WHERE kit_id = ? AND well_id = ?', [kit_id, well_id.toUpperCase()]);
  res.json({ condition_text: cond ? cond.condition_text : '' });
});

export default router;
