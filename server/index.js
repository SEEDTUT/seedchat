import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';
import { announcementsRoutes, adminRoutes } from './routes/admin.js';

const app = new Hono();

app.use('/api/*', cors());

app.route('/api/auth', authRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/friends', friendsRoutes);
app.route('/api/messages', messagesRoutes);
app.route('/api', announcementsRoutes);
app.route('/api/admin', adminRoutes);

// 静态文件
app.use('*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = process.env.PORT || 8080;
initDB();
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
