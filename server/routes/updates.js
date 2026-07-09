import { Hono } from 'hono';
import { db } from '../db.js';
import { adminRequired } from '../middleware/auth.js';

const app = new Hono();

// ==================== 公开路由（无需认证） ====================

// GET /api/updates - 获取所有更新，按 created_at 降序
app.get('/', (c) => {
  try {
    const updates = db.prepare(
      `SELECT id, name, description, update_content, icon, demo_video, component_code,
              price_currency, price_amount, created_at
       FROM seedchat_updates
       ORDER BY created_at DESC`
    ).all();

    return c.json(updates);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/updates/:id - 获取单个更新详情
app.get('/:id', (c) => {
  try {
    const { id } = c.req.param();

    const update = db.prepare(
      `SELECT id, name, description, update_content, icon, demo_video, component_code,
              price_currency, price_amount, created_at
       FROM seedchat_updates
       WHERE id = ?`
    ).get(id);

    if (!update) {
      return c.json({ error: '更新不存在' }, 404);
    }

    return c.json(update);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// ==================== 管理员路由（需要管理员权限） ====================

// POST /api/updates - 管理员创建更新
// body: { name, description, update_content, icon, demo_video, component_code, price_currency, price_amount }
app.post('/', adminRequired, async (c) => {
  try {
    const {
      name,
      description,
      update_content,
      icon,
      demo_video,
      component_code,
      price_currency,
      price_amount,
    } = await c.req.json();

    if (!name || !description) {
      return c.json({ error: '名称和描述不能为空' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO seedchat_updates
        (id, name, description, update_content, icon, demo_video, component_code, price_currency, price_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      description,
      update_content || null,
      icon || null,
      demo_video || null,
      component_code || null,
      price_currency || null,
      price_amount || null,
      createdAt
    );

    return c.json({
      id,
      name,
      description,
      update_content: update_content || null,
      icon: icon || null,
      demo_video: demo_video || null,
      component_code: component_code || null,
      price_currency: price_currency || null,
      price_amount: price_amount || null,
      created_at: createdAt,
    }, 201);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// PUT /api/updates/:id - 管理员更新更新内容
app.put('/:id', adminRequired, async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const existing = db.prepare('SELECT id FROM seedchat_updates WHERE id = ?').get(id);
    if (!existing) {
      return c.json({ error: '更新不存在' }, 404);
    }

    // 逐字段更新，仅更新请求中提供的字段
    const fields = [
      'name',
      'description',
      'update_content',
      'icon',
      'demo_video',
      'component_code',
      'price_currency',
      'price_amount',
    ];

    const updates = [];
    const values = [];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: '没有需要更新的字段' }, 400);
    }

    values.push(id);
    db.prepare(`UPDATE seedchat_updates SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(
      `SELECT id, name, description, update_content, icon, demo_video, component_code,
              price_currency, price_amount, created_at
       FROM seedchat_updates
       WHERE id = ?`
    ).get(id);

    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// DELETE /api/updates/:id - 管理员删除更新
app.delete('/:id', adminRequired, (c) => {
  try {
    const { id } = c.req.param();

    const existing = db.prepare('SELECT id FROM seedchat_updates WHERE id = ?').get(id);
    if (!existing) {
      return c.json({ error: '更新不存在' }, 404);
    }

    db.prepare('DELETE FROM seedchat_updates WHERE id = ?').run(id);

    return c.json({ message: '更新已删除' });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
