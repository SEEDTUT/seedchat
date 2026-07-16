import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { withActiveNameplateArray } from '../utils/nameplate.js';

// 公告公开接口路由（仅需 authRequired）
// 挂载在 /api，所以路由路径为 /announcements
export const announcementsRoutes = new Hono();

// GET /api/announcements - 获取置顶公告
announcementsRoutes.get('/announcements', authRequired, (c) => {
  try {
    const announcements = db.prepare(
      `SELECT id, title, content, is_pinned, created_at
       FROM seedchat_announcements
       WHERE is_pinned = 1
       ORDER BY created_at DESC`
    ).all();

    const result = announcements.map((a) => ({
      ...a,
      is_pinned: !!a.is_pinned,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// 管理员路由（全部需要 adminRequired）
// 挂载在 /api/admin
const adminRoutes = new Hono();
adminRoutes.use('*', adminRequired);

// GET /api/admin/posts - 获取所有帖子（JOIN users 获取当前 nickname/avatar/uid）
adminRoutes.get('/posts', (c) => {
  try {
    const posts = db.prepare(
      `SELECT p.id, p.user_id, p.title, p.content, p.image, p.created_at,
              u.nickname, u.avatar, u.uid, u.active_nameplate_id, u.is_sponsor,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
       FROM seedchat_posts p
       LEFT JOIN seedchat_users u ON p.user_id = u.id
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       ORDER BY p.created_at DESC`
    ).all();

    return c.json(withActiveNameplateArray(posts));
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/admin/posts/:id - 删除任意帖子
adminRoutes.delete('/posts/:id', (c) => {
  try {
    const { id } = c.req.param();

    const post = db.prepare('SELECT id FROM seedchat_posts WHERE id = ?').get(id);
    if (!post) {
      return c.json({ error: '帖子不存在' }, 404);
    }

    db.prepare('DELETE FROM seedchat_posts WHERE id = ?').run(id);
    return c.json({ message: '帖子已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/admin/users - 获取所有用户（包含 uid, nickname, avatar）
adminRoutes.get('/users', (c) => {
  try {
    const users = db.prepare(
      `SELECT u.id, u.uid, u.username, u.nickname, u.avatar, u.is_admin, u.active_nameplate_id, u.created_at, u.is_sponsor,
              np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
       FROM seedchat_users u
       LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
       ORDER BY u.uid ASC`
    ).all();

    const result = users.map((u) => ({
      ...u,
      is_admin: !!u.is_admin,
    }));

    withActiveNameplateArray(result);

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/admin/users/:id/sponsor/activate - 手动激活用户VIP（无需订单号）
adminRoutes.post('/users/:id/sponsor/activate', (c) => {
  try {
    const { id } = c.req.param();

    const targetUser = db.prepare(
      'SELECT id, is_sponsor FROM seedchat_users WHERE id = ?'
    ).get(id);

    if (!targetUser) {
      return c.json({ error: '用户不存在' }, 404);
    }

    if (targetUser.is_sponsor) {
      return c.json({ error: '该用户已是VIP' }, 400);
    }

    db.prepare('UPDATE seedchat_users SET is_sponsor = 1 WHERE id = ?').run(id);

    return c.json({ message: 'VIP已激活', is_sponsor: true });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/admin/users/:id/sponsor/revoke - 注销用户VIP（用户失去VIP，订单号无法再激活）
adminRoutes.post('/users/:id/sponsor/revoke', (c) => {
  try {
    const { id } = c.req.param();

    const targetUser = db.prepare(
      'SELECT id, is_sponsor FROM seedchat_users WHERE id = ?'
    ).get(id);

    if (!targetUser) {
      return c.json({ error: '用户不存在' }, 404);
    }

    if (!targetUser.is_sponsor) {
      return c.json({ error: '该用户不是VIP' }, 400);
    }

    // 注销VIP：is_sponsor 设为 0
    // 订单记录保留在 seedchat_sponsor_orders 中，因此该订单号无法再被激活
    db.prepare('UPDATE seedchat_users SET is_sponsor = 0 WHERE id = ?').run(id);

    return c.json({ message: 'VIP已注销，关联订单号无法再次激活', is_sponsor: false });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/admin/users/:id/sponsor/withdraw - 撤回用户VIP注销（删除订单记录，订单号可再次激活）
adminRoutes.post('/users/:id/sponsor/withdraw', (c) => {
  try {
    const { id } = c.req.param();

    const targetUser = db.prepare(
      'SELECT id FROM seedchat_users WHERE id = ?'
    ).get(id);

    if (!targetUser) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 查询该用户的订单记录
    const orders = db.prepare(
      'SELECT order_no FROM seedchat_sponsor_orders WHERE user_id = ?'
    ).all(id);

    // 删除该用户的所有订单记录，使订单号可以再次被激活
    db.prepare('DELETE FROM seedchat_sponsor_orders WHERE user_id = ?').run(id);

    return c.json({
      message: `已撤回VIP注销，释放了 ${orders.length} 个订单号，可再次激活`,
      released_orders: orders.length,
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/admin/users/:id - 删除用户（不能删自己，不能删其他管理员）
adminRoutes.delete('/users/:id', (c) => {
  try {
    const { id } = c.req.param();
    const currentUser = c.get('user');

    if (id === currentUser.id) {
      return c.json({ error: '不能删除自己' }, 400);
    }

    const targetUser = db.prepare(
      'SELECT id, is_admin FROM seedchat_users WHERE id = ?'
    ).get(id);

    if (!targetUser) {
      return c.json({ error: '用户不存在' }, 404);
    }

    if (targetUser.is_admin) {
      return c.json({ error: '不能删除其他管理员' }, 403);
    }

    db.prepare('DELETE FROM seedchat_users WHERE id = ?').run(id);
    return c.json({ message: '用户已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/admin/announcements - 获取所有公告（置顶排前面）
adminRoutes.get('/announcements', (c) => {
  try {
    const announcements = db.prepare(
      `SELECT id, title, content, is_pinned, created_at
       FROM seedchat_announcements
       ORDER BY is_pinned DESC, created_at DESC`
    ).all();

    const result = announcements.map((a) => ({
      ...a,
      is_pinned: !!a.is_pinned,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/admin/announcements - body: { title, content } -> 创建公告
adminRoutes.post('/announcements', async (c) => {
  try {
    const { title, content } = await c.req.json();

    if (!title || !content) {
      return c.json({ error: '标题和内容不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_announcements (id, title, content, is_pinned, created_at)
       VALUES (?, ?, ?, 0, ?)`
    ).run(id, title, content, createdAt);

    return c.json({
      id,
      title,
      content,
      is_pinned: false,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// PATCH /api/admin/announcements/:id - body: { is_pinned } -> 设置/取消置顶
adminRoutes.patch('/announcements/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { is_pinned } = await c.req.json();

    if (typeof is_pinned !== 'boolean') {
      return c.json({ error: 'is_pinned 必须为布尔值' }, 400);
    }

    const existing = db.prepare(
      'SELECT id FROM seedchat_announcements WHERE id = ?'
    ).get(id);

    if (!existing) {
      return c.json({ error: '公告不存在' }, 404);
    }

    db.prepare(
      'UPDATE seedchat_announcements SET is_pinned = ? WHERE id = ?'
    ).run(is_pinned ? 1 : 0, id);

    const announcement = db.prepare(
      `SELECT id, title, content, is_pinned, created_at
       FROM seedchat_announcements WHERE id = ?`
    ).get(id);

    return c.json({
      ...announcement,
      is_pinned: !!announcement.is_pinned,
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/admin/announcements/:id - 删除公告
adminRoutes.delete('/announcements/:id', (c) => {
  try {
    const { id } = c.req.param();

    const existing = db.prepare(
      'SELECT id FROM seedchat_announcements WHERE id = ?'
    ).get(id);

    if (!existing) {
      return c.json({ error: '公告不存在' }, 404);
    }

    db.prepare('DELETE FROM seedchat_announcements WHERE id = ?').run(id);
    return c.json({ message: '公告已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export { adminRoutes };
