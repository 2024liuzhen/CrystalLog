import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DB_PATH = join(DATA_DIR, 'crystallog.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Wrap sql.js to provide a sync-like interface
// sql.js run() returns the db itself, we use that
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export async function initDb() {
  await getDb();

  run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      md_code TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS kit_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kit_id INTEGER NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
      well_id TEXT NOT NULL,
      condition_text TEXT NOT NULL,
      UNIQUE(kit_id, well_id)
    )
  `);

  run(`
    CREATE TABLE IF NOT EXISTS crystals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      protein_name TEXT NOT NULL,
      protein_conc TEXT,
      kit_id INTEGER REFERENCES kits(id),
      well_id TEXT,
      condition_text TEXT,
      method TEXT DEFAULT 'Sitting Drop',
      protein_vol REAL DEFAULT 0.5,
      reservoir_vol_drop REAL DEFAULT 0.5,
      reservoir_vol_total REAL DEFAULT 60,
      notes TEXT,
      image_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed admin user (password from env or random)
  const admin = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const pw = process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(2, 10);
    const hash = bcrypt.hashSync(pw, 10);
    run('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)', ['admin', hash, 'Admin', 'admin']);
    console.log(`Admin user created. Username: admin, Password: ${pw}`);
  }

  console.log('Database initialized successfully');
}

// Wrapper that returns the DB object for advanced use
function execRaw(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db;
}

// Export the wrapper functions
export { run, get, all, execRaw };

// Direct run
if (process.argv.includes('--init')) {
  initDb().then(() => process.exit(0));
}
