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
  // last_active 记录用户最近一次活跃时间，用于在线状态判断（每次 API 请求更新）
  addColumnIfMissing('seedchat_users', 'last_active', 'TEXT');

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

  // 清理已移除的 AI 用户数据（如果存在）
  const AI_USER_ID = 'open-seed-ai-0000-0000-000000000001';
  const aiUser = db.prepare('SELECT id FROM seedchat_users WHERE id = ?').get(AI_USER_ID);
  if (aiUser) {
    db.prepare('DELETE FROM seedchat_messages WHERE sender_id = ? OR receiver_id = ?').run(AI_USER_ID, AI_USER_ID);
    db.prepare('DELETE FROM seedchat_friendships WHERE follower_id = ? OR followee_id = ?').run(AI_USER_ID, AI_USER_ID);
    db.prepare('DELETE FROM seedchat_notifications WHERE from_user_id = ? OR user_id = ?').run(AI_USER_ID, AI_USER_ID);
    db.prepare('DELETE FROM seedchat_users WHERE id = ?').run(AI_USER_ID);
    console.log('Cleaned up removed AI user data');
  }

  console.log('Database initialized with migrations');
}
