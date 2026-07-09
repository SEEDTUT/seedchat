import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '570baab1a5deea9b67a9b71fcd1a862e';
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

function stripDataUriPrefix(dataUri) {
  const match = dataUri.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,/);
  return match ? dataUri.slice(match[0].length) : dataUri;
}

app.post('/image', authRequired, async (c) => {
  try {
    const body = await c.req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return c.json({ error: '图片数据不能为空' }, 400);
    }

    if (image.length > MAX_BASE64_LENGTH) {
      return c.json({ error: '图片大小超过 10MB 限制' }, 413);
    }

    const base64Data = stripDataUriPrefix(image);

    // Use URLSearchParams for reliable cross-platform compatibility
    const params = new URLSearchParams();
    params.append('image', base64Data);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    const result = await response.json();

    if (!response.ok || !result || !result.success || !result.data) {
      console.error('[upload] ImgBB error:', response.status, JSON.stringify(result));
      return c.json({ error: '图片上传失败', detail: result?.error?.message || `HTTP ${response.status}` }, 500);
    }

    const { display_url, thumb, delete_url } = result.data;

    return c.json({
      url: display_url,
      thumb_url: (thumb && thumb.url) || display_url,
      delete_url: delete_url || null,
    });
  } catch (err) {
    console.error('[upload] Exception:', err.message);
    return c.json({ error: '图片上传失败', detail: err.message }, 500);
  }
});

export default app;
