import { Hono } from 'hono';
import { db } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const app = new Hono();

// 所有路由都需要认证
app.use('*', authRequired);

// GET /api/nameplates/my - 获取我的所有铭牌，标记当前激活的
app.get('/my', (c) => {
  try {
    const user = c.get('user');

    const nameplates = db.prepare(
      `SELECT id, user_id, text, bg_color, text_color, granted_by, created_at
       FROM seedchat_nameplates
       WHERE user_id = ?
       ORDER BY created_at ASC`
    ).all(user.id);

    const result = nameplates.map((n) => ({
      ...n,
      is_active: n.id === user.active_nameplate_id,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/nameplates/:nameplateId/activate - 激活某个铭牌（仅能激活自己的）
app.post('/:nameplateId/activate', (c) => {
  try {
    const { nameplateId } = c.req.param();
    const user = c.get('user');

    // 校验该铭牌属于当前用户
    const nameplate = db.prepare(
      'SELECT id, user_id FROM seedchat_nameplates WHERE id = ?'
    ).get(nameplateId);

    if (!nameplate) {
      return c.json({ error: '铭牌不存在' }, 404);
    }

    if (nameplate.user_id !== user.id) {
      return c.json({ error: '无权激活此铭牌' }, 403);
    }

    db.prepare('UPDATE seedchat_users SET active_nameplate_id = ? WHERE id = ?').run(
      nameplateId,
      user.id
    );

    return c.json({ message: '铭牌已激活', active_nameplate_id: nameplateId });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// POST /api/nameplates/:nameplateId/deactivate - 取消激活铭牌（仅能取消自己的）
app.post('/:nameplateId/deactivate', (c) => {
  try {
    const { nameplateId } = c.req.param();
    const user = c.get('user');

    // 校验该铭牌属于当前用户
    const nameplate = db.prepare(
      'SELECT id, user_id FROM seedchat_nameplates WHERE id = ?'
    ).get(nameplateId);

    if (!nameplate) {
      return c.json({ error: '铭牌不存在' }, 404);
    }

    if (nameplate.user_id !== user.id) {
      return c.json({ error: '无权操作此铭牌' }, 403);
    }

    // 仅当当前激活的正是该铭牌时才清除
    if (user.active_nameplate_id === nameplateId) {
      db.prepare('UPDATE seedchat_users SET active_nameplate_id = NULL WHERE id = ?').run(user.id);
    }

    return c.json({ message: '铭牌已取消激活', active_nameplate_id: null });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// ==================== 管理员路由 ====================

// POST /api/nameplates/grant - 管理员授予用户铭牌
// body: { user_id, text, bg_color, text_color }
app.post('/grant', adminRequired, async (c) => {
  try {
    const { user_id, text, bg_color, text_color } = await c.req.json();
    const admin = c.get('user');

    if (!user_id || !text) {
      return c.json({ error: 'user_id 和 text 不能为空' }, 400);
    }

    // 校验目标用户存在
    const targetUser = db.prepare('SELECT id FROM seedchat_users WHERE id = ?').get(user_id);
    if (!targetUser) {
      return c.json({ error: '目标用户不存在' }, 404);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_nameplates (id, user_id, text, bg_color, text_color, granted_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user_id,
      text,
      bg_color || '#6366f1',
      text_color || '#ffffff',
      admin.id,
      createdAt
    );

    return c.json({
      id,
      user_id,
      text,
      bg_color: bg_color || '#6366f1',
      text_color: text_color || '#ffffff',
      granted_by: admin.id,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/nameplates/user/:userId - 管理员查看某用户的所有铭牌
app.get('/user/:userId', adminRequired, (c) => {
  try {
    const { userId } = c.req.param();

    const nameplates = db.prepare(
      `SELECT n.id, n.user_id, n.text, n.bg_color, n.text_color, n.granted_by, n.created_at,
              (u.active_nameplate_id = n.id) AS is_active
       FROM seedchat_nameplates n
       JOIN seedchat_users u ON n.user_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at ASC`
    ).all(userId);

    const result = nameplates.map((n) => ({
      ...n,
      is_active: !!n.is_active,
    }));

    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/nameplates/:nameplateId - 管理员删除铭牌
app.delete('/:nameplateId', adminRequired, (c) => {
  try {
    const { nameplateId } = c.req.param();

    const nameplate = db.prepare(
      'SELECT id, user_id FROM seedchat_nameplates WHERE id = ?'
    ).get(nameplateId);

    if (!nameplate) {
      return c.json({ error: '铭牌不存在' }, 404);
    }

    // 如果该铭牌正被用户激活，先清除用户的激活状态
    db.prepare(
      'UPDATE seedchat_users SET active_nameplate_id = NULL WHERE active_nameplate_id = ?'
    ).run(nameplateId);

    db.prepare('DELETE FROM seedchat_nameplates WHERE id = ?').run(nameplateId);

    return c.json({ message: '铭牌已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
