import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initDB } from './db.js';
import { startCleanupJob } from './cleanup.js';
import avatarBuffer from './avatarData.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';
import { announcementsRoutes, adminRoutes } from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import nameplatesRoutes from './routes/nameplates.js';
import updatesRoutes from './routes/updates.js';

const app = new Hono();

app.use('/api/*', cors());

app.route('/api/auth', authRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/friends', friendsRoutes);
app.route('/api/messages', messagesRoutes);
app.route('/api', announcementsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/nameplates', nameplatesRoutes);
app.route('/api/updates', updatesRoutes);

// 静态文件 - 带缓存头
app.use('/assets/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
});
app.use('/logo.png', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=2592000');
});
app.use('/favicon.png', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=2592000');
});
app.use('/default-avatar.png', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=2592000');
});
// 直接从嵌入的 base64 数据返回 default-avatar.png
app.get('/default-avatar.png', (c) => {
  return new Response(new Uint8Array(avatarBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000',
    },
  });
});
// Temporary DB export endpoint - will be removed after migration
app.get('/api/export-db', async (c) => {
  const { readFileSync, existsSync, statSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname2 = dirname(fileURLToPath(import.meta.url));
  const dbFile = process.env.DB_PATH || join(__dirname2, '..', 'data', 'seedchat.db');
  if (!existsSync(dbFile)) {
    return c.json({ error: 'DB not found' }, 404);
  }
  const data = readFileSync(dbFile);
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="seedchat.db"',
    },
  });
});

// DB export as base64 chunks
app.get('/api/export-db-info', async (c) => {
  const { existsSync, statSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname2 = dirname(fileURLToPath(import.meta.url));
  const dbFile = process.env.DB_PATH || join(__dirname2, '..', 'data', 'seedchat.db');
  if (!existsSync(dbFile)) {
    return c.json({ error: 'DB not found' }, 404);
  }
  const stats = statSync(dbFile);
  return c.json({ size: stats.size, chunks: Math.ceil(stats.size / 500000) });
});

app.get('/api/export-db-chunk/:index', async (c) => {
  const { readFileSync, existsSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname2 = dirname(fileURLToPath(import.meta.url));
  const dbFile = process.env.DB_PATH || join(__dirname2, '..', 'data', 'seedchat.db');
  if (!existsSync(dbFile)) {
    return c.json({ error: 'DB not found' }, 404);
  }
  const chunkIndex = parseInt(c.req.param('index'));
  const chunkSize = 500000; // 500KB per chunk
  const data = readFileSync(dbFile);
  const start = chunkIndex * chunkSize;
  const end = Math.min(start + chunkSize, data.length);
  const chunk = data.slice(start, end);
  return c.json({
    index: chunkIndex,
    totalSize: data.length,
    start,
    end,
    data: Buffer.from(chunk).toString('base64'),
  });
});

// Temporary DB backup to GitHub - runs once on startup
async function backupDbToGitHub() {
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __d = dirname(fileURLToPath(import.meta.url));
    const dbFile = process.env.DB_PATH || join(__d, '..', 'data', 'seedchat.db');
    if (!existsSync(dbFile)) {
      console.log('[backup] DB file not found, skipping backup');
      return;
    }
    
    const dbData = readFileSync(dbFile);
    console.log('[backup] DB size:', dbData.length, 'bytes');
    
    const GITHUB_TOKEN = process.env.GH_BACKUP_TOKEN;
    if (!GITHUB_TOKEN) {
      console.log('[backup] No GH_BACKUP_TOKEN env var, skipping backup');
      return;
    }
    const REPO = 'SEEDTUT/seedchat';
    
    // Create a draft release
    const releaseResp = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'seedchat-backup',
      },
      body: JSON.stringify({
        tag_name: `db-backup-${Date.now()}`,
        name: 'Database Backup',
        body: `Automated DB backup - ${new Date().toISOString()}`,
        draft: true,
      }),
    });
    
    if (!releaseResp.ok) {
      console.log('[backup] Failed to create release:', await releaseResp.text());
      return;
    }
    
    const release = await releaseResp.json();
    const uploadUrl = release.upload_url.split('{')[0];
    
    // Upload DB as release asset
    const uploadResp = await fetch(`${uploadUrl}?name=seedchat.db`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'User-Agent': 'seedchat-backup',
      },
      body: dbData,
    });
    
    if (uploadResp.ok) {
      const asset = await uploadResp.json();
      console.log('[backup] DB uploaded to GitHub:', asset.browser_download_url);
    } else {
      console.log('[backup] Upload failed:', await uploadResp.text());
    }
  } catch(e) {
    console.log('[backup] Error:', e.message);
  }
}

// Run backup after 5 seconds (let server start first)
setTimeout(backupDbToGitHub, 5000);

app.use('*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = process.env.PORT || 8080;
initDB();
// 初始化数据库后启动定时清理任务（立即执行一次，之后每小时执行一次）
startCleanupJob();
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
