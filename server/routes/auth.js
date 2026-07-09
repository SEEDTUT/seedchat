import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// PBKDF2 密码哈希（通过 Web Crypto API，Node.js 20 中可用）
const PBKDF2_ITERATIONS = 100000;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return arr;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `${toHex(salt)}:${toHex(hash)}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return toHex(hash) === hashHex;
}

// POST /api/auth/register
// body: { username, password, nickname }
// 注册用户，用 PBKDF2 hash 密码，用 nanoid 生成 token
// 如果 username === 'admin' 自动设为管理员
// 返回 { id, username, nickname, is_admin, token }
app.post('/register', async (c) => {
  try {
    const { username, password, nickname } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: '用户名和密码不能为空' }, 400);
    }

    // 检查用户名是否已存在
    const existing = db.prepare(
      'SELECT id FROM seedchat_users WHERE username = ?'
    ).get(username);
    if (existing) {
      return c.json({ error: '用户名已存在' }, 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const token = nanoid();
    const isAdmin = username === 'admin' ? 1 : 0;
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_users (id, username, password_hash, nickname, is_admin, token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, passwordHash, nickname || null, isAdmin, token, createdAt);

    return c.json({
      id,
      username,
      nickname: nickname || null,
      is_admin: !!isAdmin,
      token,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/auth/login
// body: { username, password }
// 验证密码（PBKDF2），更新 token，返回 { id, username, nickname, avatar, is_admin, token }
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: '用户名和密码不能为空' }, 400);
    }

    const user = db.prepare(
      'SELECT id, username, password_hash, nickname, avatar, is_admin FROM seedchat_users WHERE username = ?'
    ).get(username);

    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const token = nanoid();
    db.prepare('UPDATE seedchat_users SET token = ? WHERE id = ?').run(token, user.id);

    return c.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      is_admin: !!user.is_admin,
      token,
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/auth/me
// 需要 authRequired，返回当前用户 { id, username, nickname, avatar, is_admin }
app.get('/me', authRequired, (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    is_admin: !!user.is_admin,
  });
});

// POST /api/auth/update-password
// 需要 authRequired，body: { old_password, new_password }
// 验证旧密码，hash 新密码，更新
app.post('/update-password', authRequired, async (c) => {
  try {
    const { old_password, new_password } = await c.req.json();
    const user = c.get('user');

    if (!old_password || !new_password) {
      return c.json({ error: '旧密码和新密码不能为空' }, 400);
    }

    const dbUser = db.prepare(
      'SELECT password_hash FROM seedchat_users WHERE id = ?'
    ).get(user.id);

    const valid = await verifyPassword(old_password, dbUser.password_hash);
    if (!valid) {
      return c.json({ error: '旧密码错误' }, 400);
    }

    const newHash = await hashPassword(new_password);
    db.prepare('UPDATE seedchat_users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

    return c.json({ message: '密码修改成功' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/auth/update-nickname
// 需要 authRequired，body: { nickname }
// 更新昵称
app.post('/update-nickname', authRequired, async (c) => {
  try {
    const { nickname } = await c.req.json();
    const user = c.get('user');

    if (!nickname) {
      return c.json({ error: '昵称不能为空' }, 400);
    }

    db.prepare('UPDATE seedchat_users SET nickname = ? WHERE id = ?').run(nickname, user.id);

    return c.json({ message: '昵称修改成功', nickname });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/auth/update-avatar
// 需要 authRequired，body: { avatar }
// avatar 为 base64 字符串，存储它
app.post('/update-avatar', authRequired, async (c) => {
  try {
    const { avatar } = await c.req.json();
    const user = c.get('user');

    if (!avatar) {
      return c.json({ error: '头像不能为空' }, 400);
    }

    db.prepare('UPDATE seedchat_users SET avatar = ? WHERE id = ?').run(avatar, user.id);

    return c.json({ message: '头像修改成功', avatar });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
