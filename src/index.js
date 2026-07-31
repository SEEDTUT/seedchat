import { RealtimeHub } from './realtime.js';
import {
  json, requireAuth, sanitizeUser, hashPassword, generateToken, generateSalt,
  getRealtimeHub, uploadToImgbb, getPagination, createNotification, getTokenFromRequest
} from './utils.js';

export { RealtimeHub };

// ========== 主入口 ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // WebSocket 升级
    if (request.headers.get('Upgrade') === 'websocket' && path === '/api/ws') {
      return getRealtimeHub(env).fetch(request);
    }

    // API 路由
    if (path.startsWith('/api/')) {
      try {
        return await handleApiRoute(request, env, ctx, path);
      } catch (err) {
        console.error('API Error:', err);
        return json({ error: '服务器错误: ' + err.message }, 500);
      }
    }

    // 静态资源
    return env.ASSETS.fetch(request);
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ========== API 路由分发 ==========
async function handleApiRoute(request, env, ctx, path) {
  const method = request.method;
  const segments = path.split('/').filter(Boolean); // ['api', 'auth', 'register']

  // ---------- 认证 ----------
  if (segments[1] === 'auth') {
    if (segments[2] === 'register' && method === 'POST') return register(request, env);
    if (segments[2] === 'login' && method === 'POST') return login(request, env);
    if (segments[2] === 'logout' && method === 'POST') return logout(request, env);
    if (segments[2] === 'me' && method === 'GET') return getMe(request, env);
  }

  // ---------- 用户搜索 ----------
  if (segments[1] === 'users' && segments[2] === 'search' && method === 'GET') {
    return searchUsers(request, env);
  }
  if (segments[1] === 'users' && segments[2] && method === 'GET') {
    return getUserProfile(request, env, parseInt(segments[2]));
  }

  // ---------- 帖子 ----------
  if (segments[1] === 'posts') {
    return handlePosts(request, env, segments, method);
  }

  // ---------- 评论 ----------
  if (segments[1] === 'comments' && segments[2] && method === 'DELETE') {
    return deleteComment(request, env, parseInt(segments[2]));
  }

  // ---------- 好友 ----------
  if (segments[1] === 'friends') {
    return handleFriends(request, env, segments, method);
  }

  // ---------- 私信 ----------
  if (segments[1] === 'messages') {
    return handleMessages(request, env, segments, method);
  }

  // ---------- 群聊 ----------
  if (segments[1] === 'groups') {
    return handleGroups(request, env, segments, method);
  }

  // ---------- 黑名单 ----------
  if (segments[1] === 'blacklist') {
    return handleBlacklist(request, env, segments, method);
  }

  // ---------- 图片 ----------
  if (segments[1] === 'images' && segments[2] === 'upload' && method === 'POST') {
    return uploadImage(request, env);
  }

  // ---------- 设置 ----------
  if (segments[1] === 'settings') {
    return handleSettings(request, env, segments, method);
  }

  // ---------- 通知 ----------
  if (segments[1] === 'notifications') {
    return handleNotifications(request, env, segments, method);
  }

  return json({ error: '接口不存在' }, 404);
}

// ==========================================================
// 认证模块
// ==========================================================

async function register(request, env) {
  const { username, nickname, password } = await request.json();
  if (!username || !password || !nickname) {
    return json({ error: '用户名、昵称和密码不能为空' }, 400);
  }
  if (username.length < 3 || username.length > 20) {
    return json({ error: '用户名长度需在3-20个字符之间' }, 400);
  }
  if (password.length < 6) {
    return json({ error: '密码至少6位' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return json({ error: '用户名已被注册' }, 409);

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await env.DB.prepare(
    'INSERT INTO users (username, nickname, password_hash, salt) VALUES (?, ?, ?, ?)'
  ).bind(username, nickname, passwordHash, salt).run();

  const userId = result.meta.last_row_id;
  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30; // 30天
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return json({ token, user: sanitizeUser(user) }, 201);
}

async function login(request, env) {
  const { username, password } = await request.json();
  if (!username || !password) return json({ error: '用户名和密码不能为空' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  if (!user) return json({ error: '用户名或密码错误' }, 401);

  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    return json({ error: '用户名或密码错误' }, 401);
  }

  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30;
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  await env.DB.prepare('UPDATE users SET status = ?, last_active = ? WHERE id = ?')
    .bind('online', Math.floor(Date.now() / 1000), user.id).run();

  return json({ token, user: sanitizeUser(user) });
}

async function logout(request, env) {
  const token = getTokenFromRequest(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    const user = await getUserFromRequestSimple(request, env);
    if (user) {
      await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind('offline', user.id).run();
    }
  }
  return json({ success: true });
}

async function getMe(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;
  return json({ user: sanitizeUser(user) });
}

async function getUserFromRequestSimple(request, env) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return await env.DB.prepare(
    'SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, Math.floor(Date.now() / 1000)).first();
}

// ==========================================================
// 用户搜索与资料
// ==========================================================

async function searchUsers(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  if (!q) return json({ users: [] });

  const results = await env.DB.prepare(
    `SELECT id, username, nickname, avatar FROM users
     WHERE (username LIKE ? OR nickname LIKE ?) AND id != ?
     LIMIT 20`
  ).bind(`%${q}%`, `%${q}%`, user.id).all();

  return json({ users: results.results });
}

async function getUserProfile(request, env, userId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const profile = await env.DB.prepare(
    'SELECT id, username, nickname, avatar, bio, created_at, status FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!profile) return json({ error: '用户不存在' }, 404);

  // 帖子数
  const postCount = await env.DB.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').bind(userId).first();
  // 好友数
  const friendCount = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'`
  ).bind(userId, userId).first();

  // 是否是好友
  const friendship = await env.DB.prepare(
    `SELECT status FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
  ).bind(user.id, userId, userId, user.id).first();

  // 是否在黑名单
  const blocked = await env.DB.prepare(
    'SELECT id FROM blacklist WHERE user_id = ? AND blocked_id = ?'
  ).bind(user.id, userId).first();

  return json({
    user: profile,
    stats: { posts: postCount.c, friends: friendCount.c },
    friendship: friendship?.status || null,
    blocked: !!blocked,
  });
}

// ==========================================================
// 帖子模块
// ==========================================================

async function handlePosts(request, env, segments, method) {
  // GET /api/posts - 帖子列表
  if (!segments[2] && method === 'GET') return listPosts(request, env);

  // POST /api/posts - 发帖
  if (!segments[2] && method === 'POST') return createPost(request, env);

  if (segments[2]) {
    const postId = parseInt(segments[2]);

    // GET /api/posts/:id - 帖子详情
    if (method === 'GET' && !segments[3]) return getPost(request, env, postId);

    // PUT /api/posts/:id - 编辑帖子
    if (method === 'PUT' && !segments[3]) return editPost(request, env, postId);

    // DELETE /api/posts/:id - 删除帖子
    if (method === 'DELETE' && !segments[3]) return deletePost(request, env, postId);

    // POST /api/posts/:id/like - 点赞
    if (segments[3] === 'like' && method === 'POST') return likePost(request, env, postId);

    // DELETE /api/posts/:id/like - 取消点赞
    if (segments[3] === 'like' && method === 'DELETE') return unlikePost(request, env, postId);

    // POST /api/posts/:id/pin - 置顶
    if (segments[3] === 'pin' && method === 'POST') return pinPost(request, env, postId);

    // GET /api/posts/:id/comments - 评论列表
    if (segments[3] === 'comments' && method === 'GET') return listComments(request, env, postId);

    // POST /api/posts/:id/comments - 发评论
    if (segments[3] === 'comments' && method === 'POST') return createComment(request, env, postId);
  }

  return json({ error: '接口不存在' }, 404);
}

async function listPosts(request, env) {
  const { page, limit, offset } = getPagination(request);
  const url = new URL(request.url);
  const authorId = url.searchParams.get('author_id');

  let query = `
    SELECT p.*, u.nickname, u.avatar, u.username,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p JOIN users u ON p.user_id = u.id
  `;
  let params = [];
  if (authorId) {
    query += ' WHERE p.user_id = ?';
    params.push(parseInt(authorId));
  }
  query += ' ORDER BY p.pinned DESC, p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as c FROM posts' + (authorId ? ' WHERE user_id = ?' : ''))
    .bind(...(authorId ? [parseInt(authorId)] : [])).first();

  // 检查当前用户是否点赞
  let currentUser = null;
  const token = getTokenFromRequest(request);
  if (token) {
    currentUser = await env.DB.prepare(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Math.floor(Date.now() / 1000)).first();
  }

  const posts = await Promise.all(result.results.map(async (post) => {
    let liked = false;
    if (currentUser) {
      const likeRow = await env.DB.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?')
        .bind(post.id, currentUser.user_id).first();
      liked = !!likeRow;
    }
    return {
      ...post,
      images: JSON.parse(post.images || '[]'),
      liked,
    };
  }));

  return json({ posts, total: total.c, page, limit });
}

async function createPost(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { title, content, images } = await request.json();
  if (!title || !content) return json({ error: '标题和内容不能为空' }, 400);
  if (title.length > 100) return json({ error: '标题不能超过100字' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO posts (user_id, title, content, images) VALUES (?, ?, ?, ?)'
  ).bind(user.id, title, content, JSON.stringify(images || [])).run();

  const postId = result.meta.last_row_id;

  // 通过实时通讯通知所有用户刷新
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({ type: 'new_post', postId, title, authorId: user.id }),
  })).catch(() => {});

  return json({ id: postId, success: true }, 201);
}

async function getPost(request, env, postId) {
  // 增加浏览量
  await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(postId).run();

  const post = await env.DB.prepare(`
    SELECT p.*, u.nickname, u.avatar, u.username,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `).bind(postId).first();

  if (!post) return json({ error: '帖子不存在' }, 404);

  let liked = false;
  const { user } = await requireAuth(request, env);
  if (user) {
    const likeRow = await env.DB.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?')
      .bind(postId, user.id).first();
    liked = !!likeRow;
  }

  return json({ ...post, images: JSON.parse(post.images || '[]'), liked });
}

async function editPost(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const post = await env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ error: '帖子不存在' }, 404);
  if (post.user_id !== user.id) return json({ error: '无权编辑' }, 403);

  const { title, content, images } = await request.json();
  await env.DB.prepare(
    'UPDATE posts SET title = ?, content = ?, images = ?, updated_at = ? WHERE id = ?'
  ).bind(title || post.title, content, JSON.stringify(images || []), Math.floor(Date.now() / 1000), postId).run();

  return json({ success: true });
}

async function deletePost(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const post = await env.DB.prepare('SELECT user_id FROM posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ error: '帖子不存在' }, 404);
  if (post.user_id !== user.id) return json({ error: '无权删除' }, 403);

  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
  return json({ success: true });
}

async function likePost(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  try {
    await env.DB.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').bind(postId, user.id).run();
    // 通知帖子作者
    const post = await env.DB.prepare('SELECT user_id, title FROM posts WHERE id = ?').bind(postId).first();
    if (post && post.user_id !== user.id) {
      await createNotification(env, post.user_id, 'like', `${user.nickname} 赞了你的帖子「${post.title}」`, `/post/${postId}`);
    }
  } catch (e) {
    // 已点赞
  }
  const count = await env.DB.prepare('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?').bind(postId).first();
  return json({ liked: true, like_count: count.c });
}

async function unlikePost(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.id).run();
  const count = await env.DB.prepare('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?').bind(postId).first();
  return json({ liked: false, like_count: count.c });
}

async function pinPost(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const post = await env.DB.prepare('SELECT pinned FROM posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ error: '帖子不存在' }, 404);

  await env.DB.prepare('UPDATE posts SET pinned = ? WHERE id = ?').bind(post.pinned ? 0 : 1, postId).run();
  return json({ pinned: !post.pinned });
}

async function listComments(request, env, postId) {
  const result = await env.DB.prepare(`
    SELECT c.*, u.nickname, u.avatar, u.username FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).bind(postId).all();
  return json({ comments: result.results });
}

async function createComment(request, env, postId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { content, parentId } = await request.json();
  if (!content) return json({ error: '评论内容不能为空' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)'
  ).bind(postId, user.id, content, parentId || null).run();

  const commentId = result.meta.last_row_id;

  // 通知帖子作者
  const post = await env.DB.prepare('SELECT user_id, title FROM posts WHERE id = ?').bind(postId).first();
  if (post && post.user_id !== user.id) {
    await createNotification(env, post.user_id, 'comment', `${user.nickname} 评论了你的帖子「${post.title}」`, `/post/${postId}`);
  }

  return json({ id: commentId, success: true }, 201);
}

async function deleteComment(request, env, commentId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const comment = await env.DB.prepare('SELECT user_id FROM comments WHERE id = ?').bind(commentId).first();
  if (!comment) return json({ error: '评论不存在' }, 404);
  if (comment.user_id !== user.id) return json({ error: '无权删除' }, 403);

  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
  return json({ success: true });
}

// ==========================================================
// 好友模块
// ==========================================================

async function handleFriends(request, env, segments, method) {
  // GET /api/friends - 好友列表
  if (!segments[2] && method === 'GET') return listFriends(request, env);

  // GET /api/friends/requests - 好友请求列表
  if (segments[2] === 'requests' && method === 'GET') return listFriendRequests(request, env);

  // POST /api/friends/request - 发送好友请求
  if (segments[2] === 'request' && method === 'POST') return sendFriendRequest(request, env);

  // POST /api/friends/accept - 接受好友请求
  if (segments[2] === 'accept' && method === 'POST') return acceptFriendRequest(request, env);

  // POST /api/friends/reject - 拒绝好友请求
  if (segments[2] === 'reject' && method === 'POST') return rejectFriendRequest(request, env);

  // DELETE /api/friends/:id - 删除好友
  if (segments[2] && method === 'DELETE') return removeFriend(request, env, parseInt(segments[2]));

  return json({ error: '接口不存在' }, 404);
}

async function listFriends(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar, u.status FROM users u
    JOIN friendships f ON (u.id = f.friend_id AND f.user_id = ?) OR (u.id = f.user_id AND f.friend_id = ?)
    WHERE f.status = 'accepted'
  `).bind(user.id, user.id).all();

  return json({ friends: result.results });
}

async function listFriendRequests(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT f.id, u.id as user_id, u.username, u.nickname, u.avatar, f.created_at
    FROM friendships f JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC
  `).bind(user.id).all();

  return json({ requests: result.results });
}

async function sendFriendRequest(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { toUserId } = await request.json();
  if (toUserId === user.id) return json({ error: '不能添加自己为好友' }, 400);

  // 检查黑名单
  const blocked = await env.DB.prepare(
    'SELECT id FROM blacklist WHERE user_id = ? AND blocked_id = ?'
  ).bind(toUserId, user.id).first();
  if (blocked) return json({ error: '对方已将你拉黑' }, 403);

  // 检查是否已有关系
  const existing = await env.DB.prepare(
    `SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
  ).bind(user.id, toUserId, toUserId, user.id).first();

  if (existing) {
    if (existing.status === 'accepted') return json({ error: '已经是好友了' }, 400);
    if (existing.status === 'pending') return json({ error: '好友请求已发送' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)'
    ).bind(user.id, toUserId, 'pending').run();

    await createNotification(env, toUserId, 'friend_request', `${user.nickname} 请求添加你为好友`, '/friends');

    // 实时通知
    const hub = getRealtimeHub(env);
    hub.fetch(new Request('https://internal/notify', {
      method: 'POST',
      body: JSON.stringify({ type: 'send_to_user', userId: toUserId, data: { type: 'friend_request', from: sanitizeUser(user) } }),
    })).catch(() => {});

    return json({ success: true }, 201);
  } catch (e) {
    return json({ error: '发送失败' }, 500);
  }
}

async function acceptFriendRequest(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { requestId } = await request.json();
  const req = await env.DB.prepare(
    'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?'
  ).bind(requestId, user.id, 'pending').first();

  if (!req) return json({ error: '好友请求不存在' }, 404);

  await env.DB.prepare('UPDATE friendships SET status = ? WHERE id = ?').bind('accepted', requestId).run();

  await createNotification(env, req.user_id, 'friend_accept', `${user.nickname} 接受了你的好友请求`, '/chat');

  // 实时通知
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({ type: 'send_to_user', userId: req.user_id, data: { type: 'friend_accept', from: sanitizeUser(user) } }),
  })).catch(() => {});

  return json({ success: true });
}

async function rejectFriendRequest(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { requestId } = await request.json();
  await env.DB.prepare('DELETE FROM friendships WHERE id = ? AND friend_id = ?').bind(requestId, user.id).run();
  return json({ success: true });
}

async function removeFriend(request, env, friendId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  await env.DB.prepare(
    `DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
  ).bind(user.id, friendId, friendId, user.id).run();

  return json({ success: true });
}

// ==========================================================
// 私信模块
// ==========================================================

async function handleMessages(request, env, segments, method) {
  // GET /api/messages/unread/count - 未读数
  if (segments[2] === 'unread' && segments[3] === 'count' && method === 'GET') {
    return getUnreadCount(request, env);
  }

  // GET /api/messages/conversations - 会话列表
  if (segments[2] === 'conversations' && method === 'GET') {
    return listConversations(request, env);
  }

  // GET /api/messages/:userId - 与某人的聊天记录
  if (segments[2] && method === 'GET') {
    return getMessages(request, env, parseInt(segments[2]));
  }

  // POST /api/messages - 发送私信
  if (!segments[2] && method === 'POST') {
    return sendMessage(request, env);
  }

  // POST /api/messages/:id/recall - 撤回私信
  if (segments[3] === 'recall' && method === 'POST') {
    return recallMessage(request, env, parseInt(segments[2]));
  }

  return json({ error: '接口不存在' }, 404);
}

async function listConversations(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  // 获取所有会话（去重取最新消息）
  const result = await env.DB.prepare(`
    SELECT m.*, u.id as peer_id, u.username, u.nickname, u.avatar
    FROM messages m
    JOIN users u ON CASE WHEN m.from_id = ? THEN u.id = m.to_id ELSE u.id = m.from_id END
    WHERE m.id IN (
      SELECT MAX(id) FROM messages
      WHERE from_id = ? OR to_id = ?
      GROUP BY CASE WHEN from_id = ? THEN to_id ELSE from_id END
    )
    ORDER BY m.created_at DESC
  `).bind(user.id, user.id, user.id, user.id).all();

  return json({ conversations: result.results });
}

async function getMessages(request, env, peerId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const before = url.searchParams.get('before'); // 用于加载更多
  const limit = 50;

  let query = `
    SELECT * FROM messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
  `;
  let params = [user.id, peerId, peerId, user.id];
  if (before) {
    query += ' AND id < ?';
    params.push(parseInt(before));
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();
  const messages = result.results.reverse();

  // 获取对方信息
  const peer = await env.DB.prepare('SELECT id, username, nickname, avatar, status FROM users WHERE id = ?').bind(peerId).first();

  return json({ messages, peer, hasMore: result.results.length === limit });
}

async function sendMessage(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { toId, content, msgType } = await request.json();
  if (!content) return json({ error: '消息内容不能为空' }, 400);

  // 检查黑名单
  const blocked = await env.DB.prepare(
    'SELECT id FROM blacklist WHERE user_id = ? AND blocked_id = ?'
  ).bind(toId, user.id).first();
  if (blocked) return json({ error: '对方已将你拉黑' }, 403);

  const result = await env.DB.prepare(
    'INSERT INTO messages (from_id, to_id, content, msg_type) VALUES (?, ?, ?, ?)'
  ).bind(user.id, toId, content, msgType || 'text').run();

  const msgId = result.meta.last_row_id;
  const msg = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(msgId).first();

  // 通过 WebSocket 实时推送
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'send_to_user', userId: toId,
      data: { type: 'private_message', fromId: user.id, content, msgId, msgType: msgType || 'text', timestamp: Date.now() }
    }),
  })).catch(() => {});

  return json({ message: msg }, 201);
}

async function recallMessage(request, env, msgId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const msg = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(msgId).first();
  if (!msg) return json({ error: '消息不存在' }, 404);
  if (msg.from_id !== user.id) return json({ error: '无权撤回' }, 403);

  // 2分钟内可撤回
  if (Date.now() / 1000 - msg.created_at > 120) {
    return json({ error: '超过2分钟，无法撤回' }, 400);
  }

  await env.DB.prepare('UPDATE messages SET recalled = 1 WHERE id = ?').bind(msgId).run();

  // 实时通知对方
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'send_to_user', userId: msg.to_id,
      data: { type: 'recall_message', msgId, fromId: user.id, timestamp: Date.now() }
    }),
  })).catch(() => {});

  return json({ success: true });
}

async function getUnreadCount(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  // 简单统计：返回总会话数（实际未读需更复杂逻辑）
  const result = await env.DB.prepare(`
    SELECT COUNT(DISTINCT from_id) as c FROM messages
    WHERE to_id = ? AND recalled = 0
  `).bind(user.id).first();

  return json({ count: result.c });
}

// ==========================================================
// 群聊模块
// ==========================================================

async function handleGroups(request, env, segments, method) {
  // GET /api/groups - 我的群列表
  if (!segments[2] && method === 'GET') return listGroups(request, env);

  // POST /api/groups - 创建群
  if (!segments[2] && method === 'POST') return createGroup(request, env);

  if (segments[2]) {
    const groupId = parseInt(segments[2]);

    // GET /api/groups/:id - 群详情+消息
    if (method === 'GET' && !segments[3]) return getGroup(request, env, groupId);

    // DELETE /api/groups/:id - 删除群
    if (method === 'DELETE' && !segments[3]) return deleteGroup(request, env, groupId);

    // POST /api/groups/:id/messages - 发群消息
    if (segments[3] === 'messages' && !segments[4] && method === 'POST') {
      return sendGroupMessage(request, env, groupId);
    }

    // POST /api/groups/:id/messages/:msgId/recall - 撤回群消息
    if (segments[3] === 'messages' && segments[5] === 'recall' && method === 'POST') {
      return recallGroupMessage(request, env, groupId, parseInt(segments[4]));
    }

    // GET /api/groups/:id/messages - 群消息记录
    if (segments[3] === 'messages' && !segments[4] && method === 'GET') {
      return getGroupMessages(request, env, groupId);
    }

    // POST /api/groups/:id/members - 添加成员
    if (segments[3] === 'members' && method === 'POST') {
      return addGroupMember(request, env, groupId);
    }

    // DELETE /api/groups/:id/members/:userId - 移除成员
    if (segments[3] === 'members' && segments[4] && method === 'DELETE') {
      return removeGroupMember(request, env, groupId, parseInt(segments[4]));
    }

    // POST /api/groups/:id/leave - 退群
    if (segments[3] === 'leave' && method === 'POST') {
      return leaveGroup(request, env, groupId);
    }

    // POST /api/groups/:id/invite - 生成邀请链接
    if (segments[3] === 'invite' && method === 'POST') {
      return createGroupInvite(request, env, groupId);
    }

    // GET /api/groups/:id/invite - 获取现有邀请码
    if (segments[3] === 'invite' && method === 'GET') {
      return getGroupInvite(request, env, groupId);
    }
  }

  // GET /api/groups/invite/:code - 通过邀请码获取群信息
  if (segments[2] === 'invite' && segments[3] && method === 'GET') {
    return getInviteInfo(request, env, segments[3]);
  }

  // POST /api/groups/join - 通过邀请码加群
  if (segments[2] === 'join' && method === 'POST') {
    return joinGroupByCode(request, env);
  }

  return json({ error: '接口不存在' }, 404);
}

async function listGroups(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT g.*, gm.role,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups g JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ? ORDER BY g.created_at DESC
  `).bind(user.id).all();

  return json({ groups: result.results });
}

async function createGroup(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { name, description, memberIds } = await request.json();
  if (!name) return json({ error: '群名不能为空' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO groups (name, description, owner_id) VALUES (?, ?, ?)'
  ).bind(name, description || '', user.id).run();

  const groupId = result.meta.last_row_id;

  // 添加群主
  await env.DB.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)')
    .bind(groupId, user.id, 'owner').run();

  // 添加其他成员
  if (memberIds && memberIds.length) {
    for (const memberId of memberIds) {
      if (memberId !== user.id) {
        try {
          await env.DB.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').bind(groupId, memberId).run();
          await createNotification(env, memberId, 'group_invite', `${user.nickname} 邀请你加入群聊「${name}」`, '/groups');
        } catch (e) {}
      }
    }
  }

  return json({ id: groupId, success: true }, 201);
}

async function getGroup(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  // 检查是否是群成员
  const membership = await env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, user.id).first();
  if (!membership) return json({ error: '你不是群成员' }, 403);

  const group = await env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId).first();
  const members = await env.DB.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar, u.status, gm.role, gm.joined_at
    FROM group_members gm JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ? ORDER BY gm.role DESC, gm.joined_at ASC
  `).bind(groupId).all();

  return json({ group, members: members.results, myRole: membership.role });
}

async function getGroupMessages(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const membership = await env.DB.prepare(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, user.id).first();
  if (!membership) return json({ error: '你不是群成员' }, 403);

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limit = 50;

  let query = `
    SELECT gm.*, u.nickname, u.avatar, u.username FROM group_messages gm
    JOIN users u ON gm.from_id = u.id
    WHERE gm.group_id = ?
  `;
  let params = [groupId];
  if (before) {
    query += ' AND gm.id < ?';
    params.push(parseInt(before));
  }
  query += ' ORDER BY gm.created_at DESC LIMIT ?';
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();
  return json({ messages: result.results.reverse(), hasMore: result.results.length === limit });
}

async function sendGroupMessage(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const membership = await env.DB.prepare(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, user.id).first();
  if (!membership) return json({ error: '你不是群成员' }, 403);

  const { content, msgType } = await request.json();
  if (!content) return json({ error: '消息内容不能为空' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO group_messages (group_id, from_id, content, msg_type) VALUES (?, ?, ?, ?)'
  ).bind(groupId, user.id, content, msgType || 'text').run();

  const msgId = result.meta.last_row_id;
  const msg = await env.DB.prepare(
    'SELECT gm.*, u.nickname, u.avatar FROM group_messages gm JOIN users u ON gm.from_id = u.id WHERE gm.id = ?'
  ).bind(msgId).first();

  // 通过 WebSocket 推送给群成员
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'send_to_group', groupId,
      data: { type: 'group_message', groupId, fromId: user.id, fromName: user.nickname, fromAvatar: user.avatar, content, msgId, msgType: msgType || 'text', timestamp: Date.now() }
    }),
  })).catch(() => {});

  return json({ message: msg }, 201);
}

async function recallGroupMessage(request, env, groupId, msgId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const msg = await env.DB.prepare('SELECT * FROM group_messages WHERE id = ? AND group_id = ?').bind(msgId, groupId).first();
  if (!msg) return json({ error: '消息不存在' }, 404);
  if (msg.from_id !== user.id) return json({ error: '无权撤回' }, 403);

  if (Date.now() / 1000 - msg.created_at > 120) {
    return json({ error: '超过2分钟，无法撤回' }, 400);
  }

  await env.DB.prepare('UPDATE group_messages SET recalled = 1 WHERE id = ?').bind(msgId).run();

  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'send_to_group', groupId,
      data: { type: 'recall_group_message', msgId, groupId, timestamp: Date.now() }
    }),
  })).catch(() => {});

  return json({ success: true });
}

async function addGroupMember(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { userId } = await request.json();
  try {
    await env.DB.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').bind(groupId, userId).run();
    return json({ success: true });
  } catch (e) {
    return json({ error: '添加失败，可能已在群中' }, 400);
  }
}

async function removeGroupMember(request, env, groupId, userId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  // 群主或本人可操作
  const membership = await env.DB.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, user.id).first();
  if (user.id !== userId && membership?.role !== 'owner' && membership?.role !== 'admin') {
    return json({ error: '无权操作' }, 403);
  }

  await env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, userId).run();
  return json({ success: true });
}

async function leaveGroup(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const group = await env.DB.prepare('SELECT owner_id FROM groups WHERE id = ?').bind(groupId).first();
  if (group?.owner_id === user.id) {
    return json({ error: '群主不能退群，请先转让或解散' }, 400);
  }

  await env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, user.id).run();
  return json({ success: true });
}

async function deleteGroup(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const group = await env.DB.prepare('SELECT owner_id FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) return json({ error: '群不存在' }, 404);
  if (group.owner_id !== user.id) return json({ error: '只有群主可以解散群聊' }, 403);

  await env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
  return json({ success: true });
}

// 群邀请：生成邀请码
async function createGroupInvite(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const membership = await env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(groupId, user.id).first();
  if (!membership) return json({ error: '你不是群成员' }, 403);

  // 检查是否已有有效邀请码
  const existing = await env.DB.prepare(
    "SELECT * FROM group_invites WHERE group_id = ? AND (expires_at IS NULL OR expires_at > ?)"
  ).bind(groupId, Math.floor(Date.now() / 1000)).first();

  if (existing) {
    return json({ code: existing.code, url: `${new URL(request.url).origin}/#join/${existing.code}` });
  }

  // 生成新的邀请码
  const code = generateToken().substring(0, 12);
  await env.DB.prepare(
    'INSERT INTO group_invites (group_id, code, created_by) VALUES (?, ?, ?)'
  ).bind(groupId, code, user.id).run();

  return json({ code, url: `${new URL(request.url).origin}/#join/${code}` }, 201);
}

// 获取群已有邀请码
async function getGroupInvite(request, env, groupId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const invite = await env.DB.prepare(
    "SELECT * FROM group_invites WHERE group_id = ? AND (expires_at IS NULL OR expires_at > ?)"
  ).bind(groupId, Math.floor(Date.now() / 1000)).first();

  if (!invite) return json({ code: null, url: null });
  return json({ code: invite.code, url: `${new URL(request.url).origin}/#join/${invite.code}` });
}

// 通过邀请码获取群信息
async function getInviteInfo(request, env, code) {
  const invite = await env.DB.prepare(
    `SELECT gi.*, g.name, g.description, g.avatar,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM group_invites gi JOIN groups g ON gi.group_id = g.id
     WHERE gi.code = ? AND (gi.expires_at IS NULL OR gi.expires_at > ?)`
  ).bind(code, Math.floor(Date.now() / 1000)).first();

  if (!invite) return json({ error: '邀请链接无效或已过期' }, 404);
  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return json({ error: '邀请链接已达到使用上限' }, 410);
  }

  let isMember = false;
  const token = getTokenFromRequest(request);
  if (token) {
    const session = await env.DB.prepare(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Math.floor(Date.now() / 1000)).first();
    if (session) {
      const member = await env.DB.prepare(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
      ).bind(invite.group_id, session.user_id).first();
      isMember = !!member;
    }
  }

  return json({
    groupId: invite.group_id,
    name: invite.name,
    description: invite.description,
    memberCount: invite.member_count,
    isMember,
  });
}

// 通过邀请码加群
async function joinGroupByCode(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { code } = await request.json();
  if (!code) return json({ error: '邀请码不能为空' }, 400);

  const invite = await env.DB.prepare(
    "SELECT * FROM group_invites WHERE code = ? AND (expires_at IS NULL OR expires_at > ?)"
  ).bind(code, Math.floor(Date.now() / 1000)).first();

  if (!invite) return json({ error: '邀请链接无效或已过期' }, 404);
  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return json({ error: '邀请链接已达到使用上限' }, 410);
  }

  // 检查是否已是成员
  const existing = await env.DB.prepare(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
  ).bind(invite.group_id, user.id).first();

  if (existing) return json({ error: '你已经是群成员了', groupId: invite.group_id }, 400);

  // 加入群聊
  await env.DB.prepare(
    'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)'
  ).bind(invite.group_id, user.id).run();

  // 更新使用次数
  await env.DB.prepare(
    'UPDATE group_invites SET uses = uses + 1 WHERE id = ?'
  ).bind(invite.id).run();

  // 通知群成员
  const hub = getRealtimeHub(env);
  hub.fetch(new Request('https://internal/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: 'send_to_group', groupId: invite.group_id,
      data: { type: 'group_member_joined', groupId: invite.group_id, userId: user.id, userName: user.nickname, timestamp: Date.now() }
    }),
  })).catch(() => {});

  return json({ success: true, groupId: invite.group_id }, 201);
}

// ==========================================================
// 黑名单模块
// ==========================================================

async function handleBlacklist(request, env, segments, method) {
  if (!segments[2] && method === 'GET') return listBlacklist(request, env);
  if (!segments[2] && method === 'POST') return addToBlacklist(request, env);
  if (segments[2] && method === 'DELETE') return removeFromBlacklist(request, env, parseInt(segments[2]));
  return json({ error: '接口不存在' }, 404);
}

async function listBlacklist(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT b.id, b.created_at, u.id as user_id, u.username, u.nickname, u.avatar
    FROM blacklist b JOIN users u ON b.blocked_id = u.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC
  `).bind(user.id).all();

  return json({ blacklist: result.results });
}

async function addToBlacklist(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { userId } = await request.json();
  if (userId === user.id) return json({ error: '不能拉黑自己' }, 400);

  try {
    await env.DB.prepare('INSERT INTO blacklist (user_id, blocked_id) VALUES (?, ?)').bind(user.id, userId).run();
    // 同时删除好友关系
    await env.DB.prepare(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
    ).bind(user.id, userId, userId, user.id).run();
    return json({ success: true }, 201);
  } catch (e) {
    return json({ error: '已在黑名单中' }, 400);
  }
}

async function removeFromBlacklist(request, env, blockedId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  await env.DB.prepare('DELETE FROM blacklist WHERE user_id = ? AND blocked_id = ?').bind(user.id, blockedId).run();
  return json({ success: true });
}

// ==========================================================
// 图片上传模块
// ==========================================================

async function uploadImage(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { image } = await request.json(); // base64 编码的图片（不含 data:image/... 前缀）
  if (!image) return json({ error: '图片数据不能为空' }, 400);

  try {
    const result = await uploadToImgbb(image, env);
    return json({ success: true, ...result }, 201);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ==========================================================
// 设置模块
// ==========================================================

async function handleSettings(request, env, segments, method) {
  if (segments[2] === 'profile' && method === 'PUT') return updateProfile(request, env);
  if (segments[2] === 'password' && method === 'PUT') return changePassword(request, env);
  if (segments[2] === 'account' && method === 'DELETE') return deleteAccount(request, env);
  return json({ error: '接口不存在' }, 404);
}

async function updateProfile(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { nickname, avatar, bio } = await request.json();
  await env.DB.prepare('UPDATE users SET nickname = ?, avatar = ?, bio = ? WHERE id = ?')
    .bind(nickname || user.nickname, avatar || user.avatar, bio ?? user.bio, user.id).run();

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  return json({ user: sanitizeUser(updated) });
}

async function changePassword(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { oldPassword, newPassword } = await request.json();
  if (!newPassword || newPassword.length < 6) return json({ error: '新密码至少6位' }, 400);

  const passwordHash = await hashPassword(oldPassword, user.salt);
  if (passwordHash !== user.password_hash) return json({ error: '旧密码错误' }, 401);

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .bind(newHash, newSalt, user.id).run();

  // 删除所有其他会话
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  // 重新登录
  const token = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30;
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, user.id, expiresAt).run();

  return json({ token, success: true });
}

async function deleteAccount(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const { password } = await request.json();
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) return json({ error: '密码错误' }, 401);

  // 删除用户（级联删除关联数据）
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
  return json({ success: true });
}

// ==========================================================
// 通知模块
// ==========================================================

async function handleNotifications(request, env, segments, method) {
  if (!segments[2] && method === 'GET') return listNotifications(request, env);
  if (segments[2] === 'read-all' && method === 'PUT') return readAllNotifications(request, env);
  if (segments[2] && segments[3] === 'read' && method === 'PUT') {
    return readNotification(request, env, parseInt(segments[2]));
  }
  return json({ error: '接口不存在' }, 404);
}

async function listNotifications(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  const result = await env.DB.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(user.id).all();

  const unread = await env.DB.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0')
    .bind(user.id).first();

  return json({ notifications: result.results, unread: unread.c });
}

async function readNotification(request, env, notifId) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  await env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').bind(notifId, user.id).run();
  return json({ success: true });
}

async function readAllNotifications(request, env) {
  const { error, user } = await requireAuth(request, env);
  if (error) return error;

  await env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(user.id).run();
  return json({ success: true });
}
