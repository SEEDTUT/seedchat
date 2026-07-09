import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/messages - 获取会话列表
// 返回 [{ user_id, username, last_message, last_time, unread_count }]
// 按最近时间排序
app.get('/', (c) => {
  try {
    const currentUserId = c.get('user').id;

    const conversations = db.prepare(
      `SELECT
         conv.user_id,
         conv.username,
         conv.last_message,
         conv.last_time,
         COALESCE(unread.unread_count, 0) AS unread_count
       FROM (
         SELECT
           other_user.id AS user_id,
           other_user.username AS username,
           last_msg.content AS last_message,
           last_msg.created_at AS last_time
         FROM (
           SELECT
             CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
             MAX(created_at) AS last_time
           FROM seedchat_messages
           WHERE sender_id = ? OR receiver_id = ?
           GROUP BY other_id
         ) latest
         JOIN seedchat_users other_user ON other_user.id = latest.other_id
         JOIN seedchat_messages last_msg
           ON last_msg.created_at = latest.last_time
           AND (
             (last_msg.sender_id = ? AND last_msg.receiver_id = latest.other_id)
             OR
             (last_msg.receiver_id = ? AND last_msg.sender_id = latest.other_id)
           )
       ) conv
       LEFT JOIN (
         SELECT sender_id, COUNT(*) AS unread_count
         FROM seedchat_messages
         WHERE receiver_id = ? AND is_read = 0
         GROUP BY sender_id
       ) unread ON unread.sender_id = conv.user_id
       ORDER BY conv.last_time DESC`
    ).all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId);

    return c.json(conversations);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/messages/:userId - 获取与某用户的消息记录（双向），按时间升序
// 同时将收到的消息标记为已读
app.get('/:userId', (c) => {
  try {
    const { userId: otherUserId } = c.req.param();
    const currentUserId = c.get('user').id;

    // 标记收到的消息为已读
    db.prepare(
      `UPDATE seedchat_messages
       SET is_read = 1
       WHERE receiver_id = ? AND sender_id = ?`
    ).run(currentUserId, otherUserId);

    const messages = db.prepare(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at
       FROM seedchat_messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`
    ).all(currentUserId, otherUserId, otherUserId, currentUserId);

    return c.json(messages);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/messages/:userId - body: { content } -> 发送私信
app.post('/:userId', async (c) => {
  try {
    const { userId: receiverId } = c.req.param();
    const { content } = await c.req.json();
    const user = c.get('user');

    if (!content) {
      return c.json({ error: '消息内容不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_messages (id, sender_id, receiver_id, content, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    ).run(id, user.id, receiverId, content, createdAt);

    return c.json({
      id,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      is_read: 0,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
