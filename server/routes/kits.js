import { Router } from 'express';
import multer from 'multer';
import { read, utils } from 'xlsx';
import { get, all, run } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { processSheetData, kitNameFromFilename } from '../services/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const router = Router();

const uploadDir = path.join(DATA_DIR, 'temp');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// GET /api/kits
router.get('/', authenticate, async (req, res) => {
  const kits = all(`
    SELECT k.*, u.display_name as created_by_name,
      (SELECT COUNT(*) FROM kit_conditions WHERE kit_id = k.id) as condition_count
    FROM kits k
    LEFT JOIN users u ON k.created_by = u.id
    ORDER BY k.created_at DESC
  `);
  res.json(kits);
});

// GET /api/kits/:id
router.get('/:id', authenticate, async (req, res) => {
  const kit = get(`
    SELECT k.*, u.display_name as created_by_name
    FROM kits k LEFT JOIN users u ON k.created_by = u.id
    WHERE k.id = ?
  `, [req.params.id]);
  if (!kit) return res.status(404).json({ error: 'Kit 不存在' });

  const conditions = all('SELECT well_id, condition_text FROM kit_conditions WHERE kit_id = ? ORDER BY well_id', [req.params.id]);
  res.json({ ...kit, conditions });
});

// POST /api/kits/upload (admin only)
router.post('/upload', authenticate, requireAdmin, upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请选择文件' });

  const results = [];

  for (const file of req.files) {
    try {
      const buf = fs.readFileSync(file.path);
      const wb = read(buf, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = utils.sheet_to_json(ws, { header: 1 });

      const result = processSheetData(data, file.originalname);

      if (result.error) {
        results.push({ file: file.originalname, success: false, error: result.error });
        continue;
      }

      const kits = result.multiKit || [result];
      const savedKits = [];

      for (const kitData of kits) {
        if (kitData.error) continue;

        const kitName = kitData.kitName || kitNameFromFilename(file.originalname);
        const { conditions } = kitData;

        const existing = get('SELECT id FROM kits WHERE name = ?', [kitName]);
        if (existing) {
          savedKits.push({ name: kitName, count: 0, skipped: true });
          continue;
        }

        run('INSERT INTO kits (name, created_by) VALUES (?, ?)', [kitName, req.user.id]);
        const kitRow = get('SELECT id FROM kits WHERE name = ? ORDER BY id DESC LIMIT 1', [kitName]);
        const kitId = kitRow.id;

        for (const [well, cond] of Object.entries(conditions)) {
          run('INSERT INTO kit_conditions (kit_id, well_id, condition_text) VALUES (?, ?, ?)', [kitId, well, cond]);
        }

        savedKits.push({ name: kitName, count: Object.keys(conditions).length });
      }

      results.push({ file: file.originalname, success: true, kits: savedKits });
    } catch (err) {
      results.push({ file: file.originalname, success: false, error: err.message });
    } finally {
      try { fs.unlinkSync(file.path); } catch {}
    }
  }

  const totalSaved = results.filter(r => r.success).reduce((sum, r) => sum + r.kits.filter(k => !k.skipped).length, 0);
  res.json({ results, totalSaved });
});

// PUT /api/kits/:id (rename)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称不能为空' });

  const kit = get('SELECT * FROM kits WHERE id = ?', [req.params.id]);
  if (!kit) return res.status(404).json({ error: 'Kit 不存在' });

  run('UPDATE kits SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ message: '修改成功' });
});

// DELETE /api/kits/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  run('DELETE FROM kits WHERE id = ?', [req.params.id]);
  res.json({ message: '删除成功' });
});

export default router;
