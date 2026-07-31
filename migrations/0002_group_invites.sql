-- 群邀请链接表
CREATE TABLE IF NOT EXISTS group_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  uses INTEGER DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invite_code ON group_invites(code);
