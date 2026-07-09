import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/friends - 获取当前用户的好友列表（followee）
// join seedchat_users 获取用户名
app.get('/', (c) => {
  try {
    const user = c.get('user');

    const friends = db.prepare(
      `SELECT u.id, u.username, f.created_at
       FROM seedchat_friendships f
       JOIN seedchat_users u ON f.followee_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`
    ).all(user.id);

    return c.json(friends);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/friends/users - 获取所有用户列表（排除自己），带 is_friend 字段
app.get('/users', (c) => {
  try {
    const user = c.get('user');

    const users = db.prepare(
      `SELECT u.id, u.username,
              (SELECT COUNT(*) FROM seedchat_friendships f
               WHERE f.follower_id = ? AND f.followee_id = u.id) > 0 AS is_friend
       FROM seedchat_users u
       WHERE u.id != ?
       ORDER BY u.username`
    ).all(user.id, user.id);

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      is_friend: !!u.is_friend,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/friends/:userId - 关注用户（不能关注自己，ON CONFLICT DO NOTHING）
app.post('/:userId', (c) => {
  try {
    const { userId } = c.req.param();
    const user = c.get('user');

    if (userId === user.id) {
      return c.json({ error: '不能关注自己' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_friendships (id, follower_id, followee_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`
    ).run(id, user.id, userId, createdAt);

    return c.json({ message: '关注成功' }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/friends/:userId - 取消关注
app.delete('/:userId', (c) => {
  try {
    const { userId } = c.req.param();
    const user = c.get('user');

    db.prepare(
      `DELETE FROM seedchat_friendships
       WHERE follower_id = ? AND followee_id = ?`
    ).run(user.id, userId);

    return c.json({ message: '已取消关注' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
