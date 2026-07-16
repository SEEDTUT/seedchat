import { db } from '../db.js';
import { buildActiveNameplate } from '../utils/nameplate.js';

// 从 Authorization: Bearer <token> header 提取 token
// 查询数据库验证 token，返回用户信息
// { id, username, nickname, avatar, is_admin, is_admin_mode, uid, active_nameplate_id, active_nameplate } 或 null
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
      active_nameplate: null,
      last_active: null,
    };
  }

  const user = db.prepare(
    `SELECT u.id, u.username, u.nickname, u.avatar, u.is_admin, u.uid, u.active_nameplate_id, u.last_active, u.is_sponsor,
            np.text AS nameplate_text, np.bg_color AS nameplate_bg_color, np.text_color AS nameplate_text_color
     FROM seedchat_users u
     LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id
     WHERE u.token = ?`
  ).get(token);

  if (!user) {
    return null;
  }
  // 普通用户不是管理员模式
  user.is_admin_mode = false;
  // 构建嵌套的 active_nameplate 对象（{ text, bg_color, text_color } 或 null）
  user.active_nameplate = buildActiveNameplate(user);

  // 更新用户最近活跃时间，用于在线状态判断
  // better-sqlite3 为同步 API，UPDATE 非常快，直接内联执行
  const nowIso = new Date().toISOString();
  db.prepare('UPDATE seedchat_users SET last_active = ? WHERE id = ?').run(nowIso, user.id);
  user.last_active = nowIso;

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
