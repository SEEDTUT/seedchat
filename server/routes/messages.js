import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { withActiveNameplateArray } from '../utils/nameplate.js';
import { withOnlineStatusArray, isOnline } from '../utils/online.js';
import { AI_USER_ID, callGroq } from '../utils/ai.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/messages - 获取会话列表
// 返回 [{ user_id, username, nickname, avatar, last_message, last_time, unread_count, is_online }]
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
         conv.nameplate_text,
         conv.nameplate_bg_color,
         conv.nameplate_text_color,
         conv.last_active,
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
           other_user.last_active AS last_active,
           np.text AS nameplate_text,
           np.bg_color AS nameplate_bg_color,
           np.text_color AS nameplate_text_color,
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
         LEFT JOIN seedchat_nameplates np ON other_user.active_nameplate_id = np.id
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

    withActiveNameplateArray(conversations);
    withOnlineStatusArray(conversations);

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

    // 查询聊天对方（chat partner）的用户资料及激活铭牌
    // 将对方的 active_nameplate 附加到每条消息上，供前端聊天面板头部展示对方铭牌
    const partner = db.prepare(
      `SELECT u.id, u.uid, u.username, u.nickname, u.avatar, u.active_nameplate_id, u.last_active,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
       FROM seedchat_users u
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       WHERE u.id = ?`
    ).get(otherUserId);

    let partnerNameplate = null;
    if (partner) {
      partnerNameplate = partner.nameplate_text
        ? { text: partner.nameplate_text, bg_color: partner.nameplate_bg_color, text_color: partner.nameplate_text_color }
        : null;
    }

    // 在线阈值：最近 2 分钟内有活跃视为在线
    const partnerIsOnline = isOnline(partner ? partner.last_active : null);

    const result = messages.map((m) => ({
      ...m,
      // 附加聊天对方的基本资料与铭牌（所有消息的对方均为同一个 chat partner）
      partner_uid: partner ? partner.uid : null,
      partner_nickname: partner ? partner.nickname : null,
      partner_avatar: partner ? partner.avatar : null,
      partner_active_nameplate_id: partner ? partner.active_nameplate_id : null,
      partner_is_online: partnerIsOnline,
      active_nameplate: partnerNameplate,
    }));

    return c.json(result);
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
    const isAIMessage = receiverId === AI_USER_ID;

    // AI 消息跳过拉黑检查和单条消息限制
    if (!isAIMessage) {
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
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_messages (id, sender_id, receiver_id, content, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).run(id, user.id, receiverId, content, msgType, createdAt);

    // 非 AI 接收方创建通知
    if (!isAIMessage) {
      const preview = msgType === 'text' ? content : (msgType === 'image' ? '[图片]' : '[视频]');
      const notifId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO seedchat_notifications (id, user_id, type, from_user_id, from_username, from_avatar, content, is_read, created_at)
         VALUES (?, ?, 'message', ?, ?, ?, ?, 0, ?)`
      ).run(notifId, receiverId, user.id, user.username, user.avatar, preview, createdAt);
    }

    // 如果是发给 AI 的文本消息，调用 Groq API 生成回复
    if (isAIMessage && msgType === 'text') {
      // 获取最近的对话历史（最多 20 条）
      const history = db.prepare(
        `SELECT content, type, sender_id FROM seedchat_messages
         WHERE (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 20`
      ).all(user.id, AI_USER_ID, AI_USER_ID, user.id);

      // 转换为 Groq 格式（正序）
      const chatMessages = history.reverse().map((m) => ({
        role: m.sender_id === user.id ? 'user' : 'assistant',
        content: m.type === 'text' ? m.content : (m.type === 'image' ? '[图片]' : '[视频]'),
      }));

      // 调用 Groq
      const aiReply = await callGroq(chatMessages);

      // 存储 AI 回复
      const aiMsgId = crypto.randomUUID();
      const aiCreatedAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO seedchat_messages (id, sender_id, receiver_id, content, type, is_read, created_at)
         VALUES (?, ?, ?, ?, 'text', 0, ?)`
      ).run(aiMsgId, AI_USER_ID, user.id, aiReply, aiCreatedAt);

      // 返回用户的消息和 AI 的回复
      return c.json({
        id,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        type: msgType,
        is_read: 0,
        created_at: createdAt,
        ai_reply: {
          id: aiMsgId,
          sender_id: AI_USER_ID,
          receiver_id: user.id,
          content: aiReply,
          type: 'text',
          is_read: 0,
          created_at: aiCreatedAt,
        },
      }, 201);
    }

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
