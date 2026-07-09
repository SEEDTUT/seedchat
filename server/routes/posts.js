import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { withActiveNameplate, withActiveNameplateArray } from '../utils/nameplate.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/posts - 获取所有帖子，按 created_at 降序
// 不再使用帖子表中存储的 nickname/avatar，而是 JOIN users 表获取当前值
// 返回字段包含 nickname, avatar, uid, active_nameplate_id, image, comment_count
// 显示用 uid 替代 username
app.get('/', (c) => {
  try {
    const posts = db.prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count
       FROM seedchat_posts p
       LEFT JOIN seedchat_users u ON p.user_id = u.id
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       ORDER BY p.created_at DESC`
    ).all();

    const result = posts.map((p) => ({
      ...p,
      comment_count: p.comment_count || 0,
    }));

    withActiveNameplateArray(result);

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/posts - body: { title, content, image } -> 创建帖子
// image 为可选的 base64 或 URL
// 不再存储 stale nickname/avatar，仅存储 user_id（展示时 JOIN users 表）
// 管理员模式下禁止发帖
app.post('/', async (c) => {
  try {
    const { title, content, image } = await c.req.json();
    const user = c.get('user');

    // 管理员模式下不可发帖
    if (user.is_admin_mode) {
      return c.json({ error: '管理员模式下不可发帖' }, 403);
    }

    if (!title || !content) {
      return c.json({ error: '标题和内容不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 只存储 user_id 与 username（用于内部关联），nickname/avatar 通过 JOIN 实时获取
    db.prepare(
      `INSERT INTO seedchat_posts (id, user_id, username, nickname, avatar, title, content, image, created_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)`
    ).run(id, user.id, user.username, title, content, image || null, createdAt);

    return c.json({
      id,
      user_id: user.id,
      uid: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      active_nameplate_id: user.active_nameplate_id,
      active_nameplate: user.active_nameplate || null,
      title,
      content,
      image: image || null,
      created_at: createdAt,
      comment_count: 0,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/posts/:id - 获取单个帖子详情
// JOIN users 表获取当前 nickname/avatar/uid/active_nameplate_id
// 每次访问会递增该帖子的 view_count，返回值为递增后的最新浏览量
app.get('/:id', (c) => {
  try {
    const { id } = c.req.param();

    // 先递增浏览量
    const info = db.prepare(
      'UPDATE seedchat_posts SET view_count = view_count + 1 WHERE id = ?'
    ).run(id);

    if (info.changes === 0) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    const post = db.prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at, p.view_count,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count
       FROM seedchat_posts p
       LEFT JOIN seedchat_users u ON p.user_id = u.id
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       WHERE p.id = ?`
    ).get(id);

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    return c.json(withActiveNameplate({
      ...post,
      view_count: post.view_count || 0,
      comment_count: post.comment_count || 0,
    }));
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/posts/:id - 删除帖子（仅作者或管理员可删）
app.delete('/:id', (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const post = db.prepare(
      'SELECT user_id FROM seedchat_posts WHERE id = ?'
    ).get(id);

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    // 仅作者或管理员可删
    if (post.user_id !== user.id && !user.is_admin) {
      return c.json({ error: '无权删除此帖子' }, 403);
    }

    db.prepare('DELETE FROM seedchat_posts WHERE id = ?').run(id);
    return c.json({ message: '帖子已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/posts/:id/comments - 获取帖子的评论，按 created_at 升序
// JOIN users 表获取当前 nickname/avatar/uid/active_nameplate_id
app.get('/:id/comments', (c) => {
  try {
    const { id } = c.req.param();

    const comments = db.prepare(
      `SELECT cm.id, cm.post_id, cm.user_id, cm.content, cm.created_at,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
       FROM seedchat_comments cm
       LEFT JOIN seedchat_users u ON cm.user_id = u.id
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       WHERE cm.post_id = ?
       ORDER BY cm.created_at ASC`
    ).all(id);

    return c.json(withActiveNameplateArray(comments));
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/posts/:id/comments - body: { content } -> 创建评论
// 不再存储 stale nickname/avatar，仅存储 user_id（展示时 JOIN users 表）
// 管理员模式下禁止评论
app.post('/:id/comments', async (c) => {
  try {
    const { id } = c.req.param();
    const { content } = await c.req.json();
    const user = c.get('user');

    // 管理员模式下不可评论
    if (user.is_admin_mode) {
      return c.json({ error: '管理员模式下不可评论' }, 403);
    }

    if (!content) {
      return c.json({ error: '评论内容不能为空' }, 400);
    }

    // 检查帖子是否存在
    const post = db.prepare('SELECT id FROM seedchat_posts WHERE id = ?').get(id);
    if (!post) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    const commentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 只存储 user_id 与 username，nickname/avatar 通过 JOIN 实时获取
    db.prepare(
      `INSERT INTO seedchat_comments (id, post_id, user_id, username, nickname, avatar, content, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`
    ).run(commentId, id, user.id, user.username, content, createdAt);

    return c.json({
      id: commentId,
      post_id: id,
      user_id: user.id,
      uid: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      active_nameplate_id: user.active_nameplate_id,
      active_nameplate: user.active_nameplate || null,
      content,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/posts/:id/comments/:commentId - 删除评论（仅作者或管理员可删）
app.delete('/:id/comments/:commentId', (c) => {
  try {
    const { id, commentId } = c.req.param();
    const user = c.get('user');

    const comment = db.prepare(
      'SELECT user_id FROM seedchat_comments WHERE id = ? AND post_id = ?'
    ).get(commentId, id);

    if (!comment) {
      return c.json({ error: '评论不存在' }, 404);
    }

    // 仅作者或管理员可删
    if (comment.user_id !== user.id && !user.is_admin) {
      return c.json({ error: '无权删除此评论' }, 403);
    }

    db.prepare('DELETE FROM seedchat_comments WHERE id = ?').run(commentId);
    return c.json({ message: '评论已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
