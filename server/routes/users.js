import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证（查看他人主页需登录）
app.use('*', authRequired);

// GET /api/users/:userId - 获取用户公开资料
// 返回字段：id, uid, username, nickname, avatar（若被清理则为 null）, created_at, post_count（该用户发布的帖子数）
// 若用户有激活的铭牌，额外返回 active_nameplate 信息（text, bg_color, text_color）
// 用户不存在时返回 404
app.get('/:userId', (c) => {
  try {
    const { userId } = c.req.param();

    const user = db.prepare(
      'SELECT id, uid, username, nickname, avatar, active_nameplate_id, created_at FROM seedchat_users WHERE id = ?'
    ).get(userId);

    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    const postCountRow = db.prepare(
      'SELECT COUNT(*) AS post_count FROM seedchat_posts WHERE user_id = ?'
    ).get(userId);

    // 若有激活的铭牌，查询铭牌详情
    let active_nameplate = null;
    if (user.active_nameplate_id) {
      active_nameplate = db.prepare(
        'SELECT id, text, bg_color, text_color FROM seedchat_nameplates WHERE id = ?'
      ).get(user.active_nameplate_id);
    }

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
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/users/:userId/posts - 获取某用户发布的全部帖子
// 按 created_at 降序返回，JOIN users 获取当前 nickname/avatar/uid，包含 comment_count
app.get('/:userId/posts', (c) => {
  try {
    const { userId } = c.req.param();

    // 可选：先校验用户是否存在，不存在返回 404
    const user = db.prepare('SELECT id FROM seedchat_users WHERE id = ?').get(userId);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    const posts = db.prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, p.view_count,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count
       FROM seedchat_posts p
       LEFT JOIN seedchat_users u ON p.user_id = u.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    ).all(userId);

    const result = posts.map((p) => ({
      ...p,
      view_count: p.view_count || 0,
      comment_count: p.comment_count || 0,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
