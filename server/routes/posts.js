import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/posts - 获取所有帖子，按 created_at 降序
// 返回字段包含 nickname, avatar, image, comment_count
app.get('/', (c) => {
  try {
    const posts = db.prepare(
      `SELECT p.id, p.user_id, p.username, p.nickname, p.avatar, p.title, p.content, p.image, p.created_at,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count
       FROM seedchat_posts p
       ORDER BY p.created_at DESC`
    ).all();

    const result = posts.map((p) => ({
      ...p,
      comment_count: p.comment_count || 0,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/posts - body: { title, content, image } -> 创建帖子
// image 为可选的 base64 或 URL
// 存储用户发帖时的 nickname 和 avatar
app.post('/', async (c) => {
  try {
    const { title, content, image } = await c.req.json();
    const user = c.get('user');

    if (!title || !content) {
      return c.json({ error: '标题和内容不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_posts (id, user_id, username, nickname, avatar, title, content, image, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, user.id, user.username, user.nickname, user.avatar, title, content, image || null, createdAt);

    return c.json({
      id,
      user_id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
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
// 返回该帖子的所有字段（含 view_count）以及 comment_count
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
      `SELECT p.id, p.user_id, p.username, p.nickname, p.avatar, p.title, p.content, p.image, p.created_at, p.view_count,
              (SELECT COUNT(*) FROM seedchat_comments c WHERE c.post_id = p.id) AS comment_count
       FROM seedchat_posts p
       WHERE p.id = ?`
    ).get(id);

    if (!post) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    return c.json({
      ...post,
      view_count: post.view_count || 0,
      comment_count: post.comment_count || 0,
    });
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
app.get('/:id/comments', (c) => {
  try {
    const { id } = c.req.param();

    const comments = db.prepare(
      `SELECT id, post_id, user_id, username, nickname, avatar, content, created_at
       FROM seedchat_comments
       WHERE post_id = ?
       ORDER BY created_at ASC`
    ).all(id);

    return c.json(comments);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/posts/:id/comments - body: { content } -> 创建评论
// 存储用户的 username, nickname, avatar
app.post('/:id/comments', async (c) => {
  try {
    const { id } = c.req.param();
    const { content } = await c.req.json();
    const user = c.get('user');

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

    db.prepare(
      `INSERT INTO seedchat_comments (id, post_id, user_id, username, nickname, avatar, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(commentId, id, user.id, user.username, user.nickname, user.avatar, content, createdAt);

    return c.json({
      id: commentId,
      post_id: id,
      user_id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
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
