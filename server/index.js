import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initDB } from './db.js';
import { startCleanupJob } from './cleanup.js';
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
app.use('*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = process.env.PORT || 8080;
initDB();
// 初始化数据库后启动定时清理任务（立即执行一次，之后每小时执行一次）
startCleanupJob();
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
