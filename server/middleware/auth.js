import { db } from '../db.js';

// 从 Authorization: Bearer <token> header 提取 token
// 查询数据库验证 token，返回用户信息 { id, username, is_admin } 或 null
function getUserFromRequest(c) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  const user = db.prepare(
    'SELECT id, username, is_admin FROM seedchat_users WHERE token = ?'
  ).get(token);

  return user || null;
}

// 需要认证：验证 token，将用户信息挂到 c.var.user
// 无 token 或无效 token 返回 401
export async function authRequired(c, next) {
  const user = getUserFromRequest(c);
  if (!user) {
    return c.json({ error: '无效的认证令牌' }, 401);
  }
  c.set('user', user);
  await next();
}

// 需要管理员权限：先验证 token，再检查 is_admin
export async function adminRequired(c, next) {
  const user = getUserFromRequest(c);
  if (!user) {
    return c.json({ error: '无效的认证令牌' }, 401);
  }
  c.set('user', user);
  if (!user.is_admin) {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  await next();
}
