import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/posts - 获取所有帖子，按 created_at 降序
app.get('/', (c) => {
  try {
    const posts = db.prepare(
      `SELECT id, user_id, username, title, content, created_at
       FROM seedchat_posts
       ORDER BY created_at DESC`
    ).all();

    return c.json(posts);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/posts - body: { title, content } -> 创建帖子
app.post('/', async (c) => {
  try {
    const { title, content } = await c.req.json();
    const user = c.get('user');

    if (!title || !content) {
      return c.json({ error: '标题和内容不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_posts (id, user_id, username, title, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, user.id, user.username, title, content, createdAt);

    return c.json({
      id,
      user_id: user.id,
      username: user.username,
      title,
      content,
      created_at: createdAt,
    }, 201);
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

export default app;
