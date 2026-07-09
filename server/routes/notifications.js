import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/notifications - 获取当前用户的通知列表
// 按 created_at 降序，最多 50 条，包含 from_avatar
app.get('/', (c) => {
  try {
    const user = c.get('user');

    const notifications = db.prepare(
      `SELECT id, user_id, type, from_user_id, from_username, from_avatar, content, is_read, created_at
       FROM seedchat_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).all(user.id);

    const result = notifications.map((n) => ({
      ...n,
      is_read: !!n.is_read,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/notifications/unread-count - 获取未读通知数量
app.get('/unread-count', (c) => {
  try {
    const user = c.get('user');

    const row = db.prepare(
      'SELECT COUNT(*) as count FROM seedchat_notifications WHERE user_id = ? AND is_read = 0'
    ).get(user.id);

    return c.json({ count: row.count });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/notifications/:id/read - 标记单条通知为已读
app.post('/:id/read', (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    db.prepare(
      'UPDATE seedchat_notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(id, user.id);

    return c.json({ message: '已标记为已读' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/notifications/read-all - 标记所有通知为已读
app.post('/read-all', (c) => {
  try {
    const user = c.get('user');

    db.prepare(
      'UPDATE seedchat_notifications SET is_read = 1 WHERE user_id = ?'
    ).run(user.id);

    return c.json({ message: '全部已读' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
