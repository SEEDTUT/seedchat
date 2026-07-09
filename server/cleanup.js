import { db } from './db.js';

// 时间常量
const HOUR = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

/**
 * 视频消息清理（7 天）
 * 删除 type='video' 且 created_at 早于 7 天前的所有消息。
 * @param {import('better-sqlite3').Database} database
 * @returns {number} 被删除的条数
 */
function cleanupVideos(database) {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const info = database
    .prepare("DELETE FROM seedchat_messages WHERE type = 'video' AND created_at < ?")
    .run(cutoff);
  console.log(
    `[cleanup] 已删除 ${info.changes} 条早于 7 天的视频消息（截止时间 ${cutoff}）`
  );
  return info.changes;
}

/**
 * 旧帖子图片归档（7 天）
 * 对于创建时间早于 7 天的帖子，若其 image 字段为 base64 图片
 * （以 'data:image' 开头），则将其清空为空字符串以释放存储。
 * 服务端无法使用 canvas 压缩，因此直接置空，前端将不再展示图片。
 * @param {import('better-sqlite3').Database} database
 * @returns {number} 被处理的帖子数
 */
function cleanupOldPostImages(database) {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  // 查找超过 7 天且带有 base64 图片的帖子
  const oldPosts = database
    .prepare(
      "SELECT id FROM seedchat_posts WHERE created_at < ? AND image LIKE 'data:image%'"
    )
    .all(cutoff);

  const updateStmt = database.prepare(
    'UPDATE seedchat_posts SET image = ? WHERE id = ?'
  );

  let compressed = 0;
  const archive = database.transaction((posts) => {
    for (const post of posts) {
      updateStmt.run('', post.id);
      compressed++;
    }
  });
  archive(oldPosts);

  console.log(
    `[cleanup] 已归档 ${compressed} 个早于 7 天帖子的 base64 图片（截止时间 ${cutoff}）`
  );
  return compressed;
}

/**
 * 不活跃用户头像清理（15 天）
 * 对于 last_login 早于 15 天的用户，将其头像置为 NULL。
 * 由于服务端无法使用 canvas 进行压缩，这里直接置空。
 * 注意：仅处理 last_login 非 NULL 的用户（即已通过新登录流程记录过登录时间的用户）。
 * @param {import('better-sqlite3').Database} database
 * @returns {number} 受影响的用户数
 */
function cleanupInactiveUserAvatars(database) {
  const cutoff = new Date(Date.now() - FIFTEEN_DAYS_MS).toISOString();
  const info = database
    .prepare(
      'UPDATE seedchat_users SET avatar = NULL WHERE last_login IS NOT NULL AND last_login < ? AND avatar IS NOT NULL'
    )
    .run(cutoff);
  console.log(
    `[cleanup] 已清理 ${info.changes} 个 15 天未登录用户的头像（last_login 早于 ${cutoff}）`
  );
  return info.changes;
}

/**
 * 执行一次完整的清理流程
 * @param {import('better-sqlite3').Database} database
 */
function runCleanup(database) {
  console.log('[cleanup] 开始执行清理任务...');
  try {
    cleanupVideos(database);
    cleanupOldPostImages(database);
    cleanupInactiveUserAvatars(database);
  } catch (err) {
    console.error('[cleanup] 清理过程中发生错误:', err);
  }
  console.log('[cleanup] 清理任务结束。');
}

/**
 * 启动定时清理任务：立即执行一次，之后每小时执行一次。
 * @param {import('better-sqlite3').Database} [database]
 */
export function startCleanupJob(database = db) {
  // 立即执行一次
  runCleanup(database);
  // 之后每小时执行一次
  setInterval(() => {
    runCleanup(database);
  }, HOUR);
  console.log('[cleanup] 定时清理任务已启动（每 1 小时执行一次）');
}
