import { db } from '../db.js';

// 从 Authorization: Bearer <token> header 提取 token
// 查询数据库验证 token，返回用户信息
// { id, username, nickname, avatar, is_admin, is_admin_mode, uid, active_nameplate_id } 或 null
function getUserFromRequest(c) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  // 管理员模式：以 'admin_' 前缀开头的 token 是管理员双密码登录产生的特殊会话
  // 不存入用户表，不持久化会话，仅在内存中识别
  if (token.startsWith('admin_')) {
    return {
      id: 'admin',
      username: '__admin__',
      nickname: '管理员',
      avatar: null,
      is_admin: 1,
      is_admin_mode: true,
      uid: 0,
      active_nameplate_id: null,
    };
  }

  const user = db.prepare(
    'SELECT id, username, nickname, avatar, is_admin, uid, active_nameplate_id FROM seedchat_users WHERE token = ?'
  ).get(token);

  if (!user) {
    return null;
  }
  // 普通用户不是管理员模式
  user.is_admin_mode = false;
  return user;
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
