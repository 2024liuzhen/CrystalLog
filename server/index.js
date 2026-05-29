import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import kitRoutes from './routes/kits.js';
import crystalRoutes from './routes/crystals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Ensure data directories exist
fs.mkdirSync(path.join(DATA_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'temp'), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files from external data dir
app.use('/uploads', express.static(path.join(DATA_DIR)));

// Serve static frontend (production)
const distDir = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);
app.use('/api/crystals', crystalRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distDir, 'index.html'));
  }
});

// Init DB and start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`CrystalLog server running on http://localhost:${PORT}`);
  });
});
