import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { withActiveNameplate, withActiveNameplateArray } from '../utils/nameplate.js';
import { isOnline } from '../utils/online.js';

const app = new Hono();

// 所有路由都需要认证（查看他人主页需登录）
app.use('*', authRequired);

// GET /api/users/:userId - 获取用户公开资料
// 返回字段：id, uid, username, nickname, avatar（若被清理则为 null）, created_at, post_count（该用户发布的帖子数）, is_online
// 若用户有激活的铭牌，额外返回 active_nameplate 信息（text, bg_color, text_color）
// 用户不存在时返回 404
app.get('/:userId', (c) => {
  try {
    const { userId } = c.req.param();

    const user = db.prepare(
      `SELECT u.id, u.uid, u.username, u.nickname, u.avatar, u.active_nameplate_id, u.created_at, u.last_active, u.is_sponsor,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
       FROM seedchat_users u
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       WHERE u.id = ?`
    ).get(userId);

    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    const postCountRow = db.prepare(
      'SELECT COUNT(*) AS post_count FROM seedchat_posts WHERE user_id = ?'
    ).get(userId);

    // 构建嵌套的 active_nameplate 对象（{ text, bg_color, text_color } 或 null）
    const active_nameplate = user.nameplate_text
      ? { text: user.nameplate_text, bg_color: user.nameplate_bg_color, text_color: user.nameplate_text_color }
      : null;
    delete user.nameplate_text;
    delete user.nameplate_bg_color;
    delete user.nameplate_text_color;

    return c.json({
      id: user.id,
      uid: user.uid,
      username: user.username,
      nickname: user.nickname,
      // 头像可能已被清理任务置为 NULL，直接返回即可
      avatar: user.avatar || null,
      active_nameplate_id: user.active_nameplate_id || null,
      active_nameplate,
      created_at: user.created_at,
      post_count: postCountRow.post_count || 0,
      is_online: isOnline(user.last_active),
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/users/:userId/posts - 获取某用户发布的全部帖子
// 按 created_at 降序返回，JOIN users 获取当前 nickname/avatar/uid，包含 comment_count,
// like_count（点赞数）, is_liked（当前用户是否已点赞）
app.get('/:userId/posts', (c) => {
  try {
    const { userId } = c.req.param();
    const currentUser = c.get('user');

    // 可选：先校验用户是否存在，不存在返回 404
    const user = db.prepare('SELECT id FROM seedchat_users WHERE id = ?').get(userId);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    const posts = db.prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, p.view_count,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id, u.is_sponsor,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count,
              (SELECT COUNT(*) FROM seedchat_post_likes pl WHERE pl.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM seedchat_post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked
       FROM seedchat_posts p
       LEFT JOIN seedchat_users u ON p.user_id = u.id
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    ).all(currentUser.id, userId);

    const result = posts.map((p) => ({
      ...p,
      view_count: p.view_count || 0,
      comment_count: p.comment_count || 0,
      like_count: p.like_count || 0,
      is_liked: !!p.is_liked,
    }));

    withActiveNameplateArray(result);

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
