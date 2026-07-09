import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { isOnline } from '../utils/online.js';
import { AI_USER_ID } from '../utils/ai.js';

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

    // 生成自增 UID = max(uid) + 1，按注册顺序排列
    const uidRow = db.prepare('SELECT MAX(uid) as max_uid FROM seedchat_users').get();
    const uid = (uidRow?.max_uid || 0) + 1;

    db.prepare(
      `INSERT INTO seedchat_users (id, username, password_hash, nickname, is_admin, token, uid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, passwordHash, nickname || null, isAdmin, token, uid, createdAt);

    // 自动与 Open Seed AI 建立互关
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO seedchat_friendships (id, follower_id, followee_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`
    ).run(crypto.randomUUID(), id, AI_USER_ID, now);
    db.prepare(
      `INSERT INTO seedchat_friendships (id, follower_id, followee_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`
    ).run(crypto.randomUUID(), AI_USER_ID, id, now);

    return c.json({
      id,
      uid,
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
// username 字段可传入用户名或昵称进行登录
// 验证密码（PBKDF2），更新 token，返回 { id, uid, username, nickname, avatar, is_admin, token }
app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: '用户名和密码不能为空' }, 400);
    }

    // 支持用户名或昵称登录
    const user = db.prepare(
      'SELECT id, uid, username, password_hash, nickname, avatar, is_admin FROM seedchat_users WHERE username = ? OR nickname = ?'
    ).get(username, username);

    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const token = nanoid();
    db.prepare('UPDATE seedchat_users SET token = ? WHERE id = ?').run(token, user.id);

    // 记录最近登录时间，供定时清理任务判断用户活跃度使用
    db.prepare('UPDATE seedchat_users SET last_login = ? WHERE id = ?').run(
      new Date().toISOString(),
      user.id
    );

    return c.json({
      id: user.id,
      uid: user.uid,
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

// POST /api/auth/admin-login
// body: { password1, password2 }
// 管理员双密码登录：两个密码必须分别匹配环境变量 ADMIN_PASSWORD_1 / ADMIN_PASSWORD_2
// 不持久化会话（不写入用户表），返回特殊 token（'admin_' 前缀），由 auth 中间件识别
app.post('/admin-login', async (c) => {
  try {
    const { password1, password2 } = await c.req.json();

    if (!password1 || !password2) {
      return c.json({ error: '两个密码都不能为空' }, 400);
    }

    const adminPassword1 = process.env.ADMIN_PASSWORD_1 || 'admin123456';
    const adminPassword2 = process.env.ADMIN_PASSWORD_2 || 'admin654321';

    if (password1 !== adminPassword1 || password2 !== adminPassword2) {
      return c.json({ error: '管理员密码错误' }, 401);
    }

    // 生成特殊管理员会话 token，不写入数据库
    const token = 'admin_' + nanoid();

    return c.json({
      is_admin_mode: true,
      token,
      uid: 0,
      nickname: '管理员',
      avatar: null,
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/auth/me
// 需要 authRequired，返回当前用户 { id, uid, username, nickname, avatar, is_admin, is_admin_mode, last_active, is_online }
// last_active 在 auth 中间件中已更新为当前时间，is_online 据此判断
app.get('/me', authRequired, (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    uid: user.uid,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    is_admin: !!user.is_admin,
    is_admin_mode: !!user.is_admin_mode,
    active_nameplate_id: user.active_nameplate_id || null,
    active_nameplate: user.active_nameplate || null,
    last_active: user.last_active || null,
    is_online: isOnline(user.last_active),
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
