import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'seedchat.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function columnExists(table, column) {
  const result = db.prepare(`PRAGMA table_info(${table})`).all();
  return result.some((row) => row.name === column);
}

function tableExists(tableName) {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
}

function addColumnIfMissing(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migration: added column ${column} to ${table}`);
  }
}

export function initDB() {
  const schema = readFileSync(join(__dirname, '..', 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Migrations for existing databases
  // Users table
  addColumnIfMissing('seedchat_users', 'nickname', 'TEXT');
  addColumnIfMissing('seedchat_users', 'avatar', 'TEXT');
  addColumnIfMissing('seedchat_users', 'last_login', 'TEXT');
  addColumnIfMissing('seedchat_users', 'uid', 'INTEGER');
  addColumnIfMissing('seedchat_users', 'active_nameplate_id', 'TEXT');

  // Posts table
  addColumnIfMissing('seedchat_posts', 'nickname', 'TEXT');
  addColumnIfMissing('seedchat_posts', 'avatar', 'TEXT');
  addColumnIfMissing('seedchat_posts', 'image', 'TEXT');
  addColumnIfMissing('seedchat_posts', 'view_count', 'INTEGER DEFAULT 0');

  // Messages table
  addColumnIfMissing('seedchat_messages', 'type', "TEXT DEFAULT 'text'");

  // 为已存在的、尚无 uid 的用户回填 uid（按注册顺序升序分配，max(uid)+1）
  const usersWithoutUid = db
    .prepare('SELECT id FROM seedchat_users WHERE uid IS NULL ORDER BY created_at ASC')
    .all();
  let nextUid =
    (db.prepare('SELECT MAX(uid) as max_uid FROM seedchat_users').get()?.max_uid || 0) + 1;
  for (const u of usersWithoutUid) {
    db.prepare('UPDATE seedchat_users SET uid = ? WHERE id = ?').run(nextUid++, u.id);
  }

  console.log('Database initialized with migrations');
}
