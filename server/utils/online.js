// 在线状态判断工具
// 基于 users.last_active 字段（每次认证请求都会更新）判断用户是否在线
// 阈值：最近 2 分钟内有活跃即视为在线

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 分钟

// 判断单个用户是否在线
// lastActive 为 ISO 字符串或 null
export function isOnline(lastActive) {
  if (!lastActive) return false;
  const last = new Date(lastActive).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last < ONLINE_THRESHOLD_MS;
}

// 为单个用户对象（原地修改）附加 is_online 布尔字段，并返回该对象
// 会删除原始的 last_active 字段以保持返回结构干净
export function withOnlineStatus(user) {
  if (!user) return user;
  const lastActive = user.last_active;
  user.is_online = isOnline(lastActive);
  delete user.last_active;
  return user;
}

// 为数组中的每个用户对象附加 is_online 字段，并返回该数组
export function withOnlineStatusArray(arr) {
  if (!Array.isArray(arr)) return arr;
  for (const item of arr) {
    withOnlineStatus(item);
  }
  return arr;
}
