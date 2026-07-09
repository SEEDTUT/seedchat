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

  // Posts table
  addColumnIfMissing('seedchat_posts', 'nickname', 'TEXT');
  addColumnIfMissing('seedchat_posts', 'avatar', 'TEXT');
  addColumnIfMissing('seedchat_posts', 'image', 'TEXT');

  // Messages table
  addColumnIfMissing('seedchat_messages', 'type', "TEXT DEFAULT 'text'");

  console.log('Database initialized with migrations');
}
