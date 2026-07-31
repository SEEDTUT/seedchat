// ========== 工具函数 ==========

// JSON 响应
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// CORS 头
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// 密码哈希 (PBKDF2)
export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

// 生成随机 token
export function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// 生成 salt
export function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// 从请求中提取 token
export function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  // 也支持 cookie
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

// 验证 token 并返回用户
export async function getUserFromRequest(request, env) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, Math.floor(Date.now() / 1000)).first();
  return row;
}

// 中间件：需要登录
export async function requireAuth(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: json({ error: '未登录' }, 401), user: null };
  return { error: null, user };
}

// 格式化用户信息（去掉敏感数据）
export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    bio: user.bio,
    created_at: user.created_at,
    status: user.status,
  };
}

// 获取或创建实时通讯 DO
export function getRealtimeHub(env) {
  const id = env.REALTIME_HUB.idFromName('global-hub');
  return env.REALTIME_HUB.get(id);
}

// 发送通知
export async function createNotification(env, userId, type, content, link = '') {
  await env.DB.prepare(
    'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)'
  ).bind(userId, type, content, link).run();
}

// 图片压缩（前端处理，后端仅转发到 imgbb）
export async function uploadToImgbb(base64Image, env) {
  const formData = new URLSearchParams();
  formData.append('image', base64Image);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${env.IMGBB_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error('图片上传失败');
  return {
    url: data.data.url,
    thumb: data.data.thumb?.url || data.data.url,
    medium: data.data.medium?.url || data.data.url,
    delete_url: data.data.delete_url,
    width: data.data.width,
    height: data.data.height,
  };
}

// 分页参数
export function getPagination(request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  return { page, limit, offset: (page - 1) * limit };
}
