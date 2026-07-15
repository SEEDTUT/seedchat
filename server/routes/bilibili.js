import { Hono } from 'hono';

const app = new Hono();

// 所有代理请求统一携带的请求头，模拟浏览器访问 Bilibili
const BILIBILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
};

// 缓存 buvid3，用于绕过 B 站风控
let cachedBuvid3 = null;
let buvid3Expire = 0;

async function getBuvid3() {
  if (cachedBuvid3 && Date.now() < buvid3Expire) return cachedBuvid3;
  try {
    const res = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: BILIBILI_HEADERS,
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.b_3) {
      cachedBuvid3 = json.data.b_3;
      buvid3Expire = Date.now() + 3600 * 1000; // 1 小时缓存
      return cachedBuvid3;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

async function bilibiliFetch(url) {
  const buvid3 = await getBuvid3();
  const headers = { ...BILIBILI_HEADERS };
  if (buvid3) {
    headers.Cookie = `buvid3=${buvid3}`;
  }
  return fetch(url, { headers });
}

// GET /feed - 获取随机热门视频列表
app.get('/feed', async (c) => {
  try {
    // 随机页码 1-20，让每次刷新结果不同
    const page = Math.floor(Math.random() * 20) + 1;
    const url = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=${page}`;

    const res = await bilibiliFetch(url);
    if (!res.ok) {
      return c.json({ error: `Bilibili API 返回状态码 ${res.status}` }, 502);
    }

    const json = await res.json();
    if (json.code !== 0) {
      return c.json(
        { error: json.message || '获取热门视频失败', code: json.code },
        502,
      );
    }

    let list = json.data?.list || [];

    // 打乱顺序，保证每次都不一样
    list = list
      .map((v) => ({ v, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(({ v }) => v);

    const videos = list.map((v) => ({
      bvid: v.bvid,
      title: v.title,
      pic: v.pic,
      duration: v.duration,
      owner: {
        name: v.owner?.name,
        mid: v.owner?.mid,
        face: v.owner?.face,
      },
      stat: {
        view: v.stat?.view,
        like: v.stat?.like,
        danmaku: v.stat?.danmaku,
        reply: v.stat?.reply,
      },
      desc: v.desc,
      aid: v.aid,
    }));

    return c.json({ videos });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /video/:bvid - 获取视频详情
app.get('/video/:bvid', async (c) => {
  try {
    const { bvid } = c.req.param();
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

    const res = await bilibiliFetch(url);
    if (!res.ok) {
      return c.json({ error: `Bilibili API 返回状态码 ${res.status}` }, 502);
    }

    const json = await res.json();
    return c.json(json);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /comments/:aid - 获取评论（使用 /x/v2/reply 端点，支持分页）
app.get('/comments/:aid', async (c) => {
  try {
    const { aid } = c.req.param();
    const page = parseInt(c.req.query('page') || '1', 10) || 1;
    const url = `https://api.bilibili.com/x/v2/reply?type=1&oid=${encodeURIComponent(aid)}&sort=2&pn=${page}&ps=20`;

    const res = await bilibiliFetch(url);
    if (!res.ok) {
      return c.json({ error: `Bilibili API 返回状态码 ${res.status}` }, 502);
    }

    const json = await res.json();
    if (json.code !== 0) {
      return c.json(
        { error: json.message || '获取评论失败', code: json.code },
        502,
      );
    }

    const replies = (json.data?.replies || []).map((r) => ({
      mid: r.mid,
      uname: r.member?.uname,
      avatar: r.member?.avatar,
      message: r.content?.message,
      like: r.like,
      ctime: r.ctime,
    }));

    const total = json.data?.page?.count || 0;

    return c.json({ replies, total });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
