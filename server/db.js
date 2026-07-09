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

export function initDB() {
  const schema = readFileSync(join(__dirname, '..', 'schema.sql'), 'utf-8');
  db.exec(schema);
}
