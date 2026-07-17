import { Hono } from 'hono';
import { createHash } from 'crypto';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// 爱发电 API 配置（从环境变量读取，回退到硬编码值）
const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID || '7e8ef6e8070111f0bdb25254001e7c00';
const AFDIAN_TOKEN = process.env.AFDIAN_TOKEN || 'Y9GjC3UF5dTvwNcamkqSsbpghKAHJERu';
const AFDIAN_API_URL = 'https://ifdian.net/api/open/query-order';
// 赞助门槛金额（元），超过此金额才能成为会员
const SPONSOR_MIN_AMOUNT = 3;
// SVIP 门槛金额（元），超过此金额成为 SVIP 会员
const SVIP_MIN_AMOUNT = 10;

// 计算爱发电 API 签名
// sign = md5(token + 'params' + params + 'ts' + ts + 'user_id' + userId)
function computeSign(token, params, ts, userId) {
  const kvString = `params${params}ts${ts}user_id${userId}`;
  return createHash('md5').update(token + kvString).digest('hex');
}

// 调用爱发电 API 查询订单
async function queryAfdianOrder(orderNo) {
  const params = JSON.stringify({ out_trade_no: orderNo });
  const ts = Math.floor(Date.now() / 1000);
  const sign = computeSign(AFDIAN_TOKEN, params, ts, AFDIAN_USER_ID);

  const body = JSON.stringify({
    user_id: AFDIAN_USER_ID,
    params,
    ts,
    sign,
  });

  const response = await fetch(AFDIAN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return response.json();
}

// POST /api/sponsor/verify
// body: { order_no }
// 验证爱发电订单号，如果订单存在且金额超过门槛，将用户标记为赞助会员
app.post('/verify', authRequired, async (c) => {
  try {
    const { order_no } = await c.req.json();
    const user = c.get('user');

    if (!order_no || !order_no.trim()) {
      return c.json({ error: '请输入订单号' }, 400);
    }

    const orderNo = order_no.trim();

    // 已经是赞助会员
    if (user.is_sponsor) {
      return c.json({ error: '你已经是赞助会员了' }, 400);
    }

    // 管理员模式下不可使用
    if (user.is_admin_mode) {
      return c.json({ error: '管理员模式下不可使用此功能' }, 403);
    }

    // 检查订单号是否已被使用
    const usedOrder = db.prepare(
      'SELECT user_id FROM seedchat_sponsor_orders WHERE order_no = ?'
    ).get(orderNo);

    if (usedOrder) {
      return c.json({ error: '该订单号已被使用' }, 400);
    }

    // 调用爱发电 API 查询订单
    const result = await queryAfdianOrder(orderNo);

    if (result.ec !== 200) {
      return c.json({ error: `爱发电API错误: ${result.em || '未知错误'}` }, 400);
    }

    const orders = result.data?.list || [];

    if (orders.length === 0) {
      return c.json({ error: '未找到该订单，请检查订单号是否正确' }, 400);
    }

    const order = orders[0];

    // 检查订单状态：status=2 表示交易成功
    if (order.status !== 2) {
      return c.json({ error: '该订单未完成支付' }, 400);
    }

    // 检查金额是否超过门槛
    const amount = parseFloat(order.total_amount);
    if (isNaN(amount) || amount < SPONSOR_MIN_AMOUNT) {
      return c.json({
        error: `赞助金额需超过 ${SPONSOR_MIN_AMOUNT} 元，当前订单金额: ${order.total_amount} 元`,
      }, 400);
    }

    // 验证通过，将用户标记为赞助会员
    // 金额 >= 10 元为 SVIP (tier=2)，否则为 VIP (tier=1)
    const tier = amount >= SVIP_MIN_AMOUNT ? 2 : 1;
    db.prepare('UPDATE seedchat_users SET is_sponsor = 1, sponsor_tier = ? WHERE id = ?').run(tier, user.id);

    // 记录订单使用情况
    const recordId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO seedchat_sponsor_orders (id, order_no, user_id, amount) VALUES (?, ?, ?, ?)'
    ).run(recordId, orderNo, user.id, order.total_amount);

    return c.json({
      message: tier === 2 ? '赞助验证成功！你已成为 SVIP 会员' : '赞助验证成功！你已成为赞助会员',
      is_sponsor: true,
      sponsor_tier: tier,
      amount: order.total_amount,
    });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /api/sponsor/status
// 返回当前用户的赞助状态
app.get('/status', authRequired, (c) => {
  const user = c.get('user');
  return c.json({ is_sponsor: !!user.is_sponsor, sponsor_tier: user.sponsor_tier || 0 });
});

export default app;
