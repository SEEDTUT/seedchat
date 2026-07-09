import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const app = new Hono();

// ImgBB API Key：优先使用环境变量，回退到默认值
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '570baab1a5deea9b67a9b71fcd1a862e';

// base64 数据大小上限：10MB
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

// 去掉 data:image/xxx;base64, 前缀，返回纯 base64 字符串
function stripDataUriPrefix(dataUri) {
  const match = dataUri.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,/);
  return match ? dataUri.slice(match[0].length) : dataUri;
}

// POST /api/upload/image
// body: { image: "data:image/jpeg;base64,..." }
// 需要认证，上传图片到 ImgBB，返回 { url, thumb_url, delete_url }
app.post('/image', authRequired, async (c) => {
  try {
    const body = await c.req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return c.json({ error: '图片数据不能为空' }, 400);
    }

    // 拒绝过大的 base64 数据
    if (image.length > MAX_BASE64_LENGTH) {
      return c.json({ error: '图片大小超过 10MB 限制' }, 413);
    }

    const base64Data = stripDataUriPrefix(image);

    // 使用原生 fetch + FormData 上传到 ImgBB
    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      return c.json({ error: '图片上传失败' }, 500);
    }

    const result = await response.json();

    if (!result || !result.success || !result.data) {
      return c.json({ error: '图片上传失败' }, 500);
    }

    const { display_url, thumb, delete_url } = result.data;

    return c.json({
      url: display_url,
      thumb_url: (thumb && thumb.url) || display_url,
      delete_url: delete_url || null,
    });
  } catch (err) {
    return c.json({ error: '图片上传失败' }, 500);
  }
});

export default app;
