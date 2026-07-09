import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/friends - 获取当前用户的好友列表（followee）
// 返回 [{ id, username, nickname, avatar, is_mutual, created_at }]
// is_mutual: 对方是否也关注了我
app.get('/', (c) => {
  try {
    const user = c.get('user');

    const friends = db.prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar, f.created_at,
              (SELECT COUNT(*) FROM seedchat_friendships r
               WHERE r.follower_id = u.id AND r.followee_id = ?) > 0 AS is_mutual
       FROM seedchat_friendships f
       JOIN seedchat_users u ON f.followee_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`
    ).all(user.id, user.id);

    const result = friends.map((f) => ({
      ...f,
      is_mutual: !!f.is_mutual,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/friends/users - 获取所有用户列表（排除自己）
// 返回 [{ id, username, nickname, avatar, is_friend, is_mutual, is_blocked }]
app.get('/users', (c) => {
  try {
    const user = c.get('user');

    const users = db.prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar,
              (SELECT COUNT(*) FROM seedchat_friendships f
               WHERE f.follower_id = ? AND f.followee_id = u.id) > 0 AS is_friend,
              (SELECT COUNT(*) FROM seedchat_friendships f
               WHERE f.follower_id = u.id AND f.followee_id = ?) > 0 AS is_mutual,
              (SELECT COUNT(*) FROM seedchat_blocks b
               WHERE b.blocker_id = ? AND b.blocked_id = u.id) > 0 AS is_blocked
       FROM seedchat_users u
       WHERE u.id != ?
       ORDER BY u.username`
    ).all(user.id, user.id, user.id, user.id);

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      is_friend: !!u.is_friend,
      is_mutual: !!u.is_mutual,
      is_blocked: !!u.is_blocked,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/friends/blocked - 获取我拉黑的用户列表
// 返回 [{ id, username, nickname, avatar }]
app.get('/blocked', (c) => {
  try {
    const user = c.get('user');

    const blocked = db.prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar
       FROM seedchat_blocks b
       JOIN seedchat_users u ON b.blocked_id = u.id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`
    ).all(user.id);

    return c.json(blocked);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/friends/:userId - 关注用户
// 先检查是否已拉黑对方，再检查是否已关注（已关注则不创建重复通知）
// 关注后为对方创建 type='follow' 的通知
app.post('/:userId', (c) => {
  try {
    const { userId } = c.req.param();
    const user = c.get('user');

    if (userId === user.id) {
      return c.json({ error: '不能关注自己' }, 400);
    }

    // 检查是否已拉黑对方
    const blocked = db.prepare(
      'SELECT id FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(user.id, userId);
    if (blocked) {
      return c.json({ error: '你已拉黑该用户，无法关注' }, 403);
    }

    // 检查是否已经关注（已关注则不创建重复通知）
    const existing = db.prepare(
      'SELECT id FROM seedchat_friendships WHERE follower_id = ? AND followee_id = ?'
    ).get(user.id, userId);
    if (existing) {
      return c.json({ message: '已经关注过了' });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_friendships (id, follower_id, followee_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`
    ).run(id, user.id, userId, createdAt);

    // 为被关注者创建通知
    const notifId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO seedchat_notifications (id, user_id, type, from_user_id, from_username, from_avatar, content, is_read, created_at)
       VALUES (?, ?, 'follow', ?, ?, ?, ?, 0, ?)`
    ).run(notifId, userId, user.id, user.username, user.avatar, '关注了你', createdAt);

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

// POST /api/friends/:userId/block - 拉黑用户
// 同时取消关注（如果正在关注）
app.post('/:userId/block', (c) => {
  try {
    const { userId } = c.req.param();
    const user = c.get('user');

    if (userId === user.id) {
      return c.json({ error: '不能拉黑自己' }, 400);
    }

    // 如果正在关注，取消关注
    db.prepare(
      `DELETE FROM seedchat_friendships WHERE follower_id = ? AND followee_id = ?`
    ).run(user.id, userId);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_blocks (id, blocker_id, blocked_id, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`
    ).run(id, user.id, userId, createdAt);

    return c.json({ message: '已拉黑' }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/friends/:userId/block - 取消拉黑
app.delete('/:userId/block', (c) => {
  try {
    const { userId } = c.req.param();
    const user = c.get('user');

    db.prepare(
      `DELETE FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?`
    ).run(user.id, userId);

    return c.json({ message: '已取消拉黑' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
