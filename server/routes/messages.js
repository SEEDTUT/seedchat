import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/messages - 获取会话列表
// 返回 [{ user_id, username, nickname, avatar, last_message, last_time, unread_count }]
// 按最近时间排序
app.get('/', (c) => {
  try {
    const currentUserId = c.get('user').id;

    const conversations = db.prepare(
      `SELECT
         conv.user_id,
         conv.uid,
         conv.username,
         conv.nickname,
         conv.avatar,
         conv.active_nameplate_id,
         conv.last_message,
         conv.last_time,
         COALESCE(unread.unread_count, 0) AS unread_count
       FROM (
         SELECT
           other_user.id AS user_id,
           other_user.uid AS uid,
           other_user.username AS username,
           other_user.nickname AS nickname,
           other_user.avatar AS avatar,
           other_user.active_nameplate_id AS active_nameplate_id,
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
// 如果任一方拉黑了对方，返回空数组
// 同时将收到的消息标记为已读
// 返回的消息包含 type 字段
app.get('/:userId', (c) => {
  try {
    const { userId: otherUserId } = c.req.param();
    const currentUserId = c.get('user').id;

    // 检查拉黑状态 - 任一方拉黑对方则返回空
    const blockedByMe = db.prepare(
      'SELECT id FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(currentUserId, otherUserId);
    const blockedByThem = db.prepare(
      'SELECT id FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(otherUserId, currentUserId);
    if (blockedByMe || blockedByThem) {
      return c.json([]);
    }

    // 标记收到的消息为已读
    db.prepare(
      `UPDATE seedchat_messages
       SET is_read = 1
       WHERE receiver_id = ? AND sender_id = ?`
    ).run(currentUserId, otherUserId);

    const messages = db.prepare(
      `SELECT id, sender_id, receiver_id, content, type, is_read, created_at
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

// GET /api/messages/:userId/new - 轮询获取新消息
// 查询参数 after=<timestamp>，返回比该时间更新的消息
// 用于实时更新
app.get('/:userId/new', (c) => {
  try {
    const { userId: otherUserId } = c.req.param();
    const after = c.req.query('after');
    const currentUserId = c.get('user').id;

    const messages = db.prepare(
      `SELECT id, sender_id, receiver_id, content, type, is_read, created_at
       FROM seedchat_messages
       WHERE ((sender_id = ? AND receiver_id = ?)
              OR (sender_id = ? AND receiver_id = ?))
       AND created_at > ?
       ORDER BY created_at ASC`
    ).all(currentUserId, otherUserId, otherUserId, currentUserId, after || '');

    return c.json(messages);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/messages/:userId - 发送私信
// body: { content, type } type 为 'text' | 'image' | 'video'
// 拉黑检查：
//   - 接收方拉黑了发送方 -> 403 { error: '消息发送失败' }
//   - 发送方拉黑了接收方 -> 403 { error: '你已拉黑该用户' }
// 单条消息限制：
//   - 如果不是互相关注（接收方未关注发送方），检查发送方是否已有任何消息发给接收方
//   - 已有消息 -> 403 { error: '对方还未关注你，你只能发送一条消息', code: 'SINGLE_MESSAGE_LIMIT' }
//   - 没有消息（第一条）-> 允许发送
// 发送后为接收方创建 type='message' 的通知，content 为消息预览
app.post('/:userId', async (c) => {
  try {
    const { userId: receiverId } = c.req.param();
    const { content, type } = await c.req.json();
    const user = c.get('user');

    if (!content) {
      return c.json({ error: '消息内容不能为空' }, 400);
    }

    const msgType = type || 'text';

    // 拉黑检查：接收方拉黑了发送方
    const receiverBlockedSender = db.prepare(
      'SELECT id FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(receiverId, user.id);
    if (receiverBlockedSender) {
      return c.json({ error: '消息发送失败' }, 403);
    }

    // 拉黑检查：发送方拉黑了接收方
    const senderBlockedReceiver = db.prepare(
      'SELECT id FROM seedchat_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(user.id, receiverId);
    if (senderBlockedReceiver) {
      return c.json({ error: '你已拉黑该用户' }, 403);
    }

    // 单条消息限制：检查是否互相关注（接收方是否关注了发送方）
    const mutual = db.prepare(
      'SELECT COUNT(*) as count FROM seedchat_friendships WHERE follower_id = ? AND followee_id = ?'
    ).get(receiverId, user.id);

    if (!mutual.count) {
      // 非互相关注，检查发送方是否已有任何消息发给接收方
      const existingMsg = db.prepare(
        'SELECT COUNT(*) as count FROM seedchat_messages WHERE sender_id = ? AND receiver_id = ?'
      ).get(user.id, receiverId);

      if (existingMsg.count > 0) {
        return c.json({ error: '对方还未关注你，你只能发送一条消息', code: 'SINGLE_MESSAGE_LIMIT' }, 403);
      }
      // 第一条消息，允许发送
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_messages (id, sender_id, receiver_id, content, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).run(id, user.id, receiverId, content, msgType, createdAt);

    // 为接收方创建通知
    const preview = msgType === 'text' ? content : (msgType === 'image' ? '[图片]' : '[视频]');
    const notifId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO seedchat_notifications (id, user_id, type, from_user_id, from_username, from_avatar, content, is_read, created_at)
       VALUES (?, ?, 'message', ?, ?, ?, ?, 0, ?)`
    ).run(notifId, receiverId, user.id, user.username, user.avatar, preview, createdAt);

    return c.json({
      id,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      type: msgType,
      is_read: 0,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
