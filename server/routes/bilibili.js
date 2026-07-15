import { Hono } from 'hono';

const app = new Hono();

// 所有代理请求统一携带的请求头，模拟浏览器访问 Bilibili
const BILIBILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
};

// GET /feed - 获取热门视频列表
// 代理到 https://api.bilibili.com/x/web-interface/popular?ps=20&pn={page}
// 简化返回 { videos: [{ bvid, title, pic, duration, owner, stat, desc, aid }] }
app.get('/feed', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10) || 1;
    const url = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=${page}`;

    const res = await fetch(url, { headers: BILIBILI_HEADERS });
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

    const list = json.data?.list || [];
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
// 代理到 https://api.bilibili.com/x/web-interface/view?bvid={bvid}
// 直接返回 Bilibili 原始数据
app.get('/video/:bvid', async (c) => {
  try {
    const { bvid } = c.req.param();
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

    const res = await fetch(url, { headers: BILIBILI_HEADERS });
    if (!res.ok) {
      return c.json({ error: `Bilibili API 返回状态码 ${res.status}` }, 502);
    }

    const json = await res.json();
    return c.json(json);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /comments/:aid - 获取评论
// 代理到 https://api.bilibili.com/x/v2/reply/main?type=1&oid={aid}&mode=3&pn={page}&ps=20
// 简化返回 { replies: [{ mid, uname, avatar, message, like, ctime }] }
app.get('/comments/:aid', async (c) => {
  try {
    const { aid } = c.req.param();
    const page = parseInt(c.req.query('page') || '1', 10) || 1;
    const url = `https://api.bilibili.com/x/v2/reply/main?type=1&oid=${encodeURIComponent(aid)}&mode=3&pn=${page}&ps=20`;

    const res = await fetch(url, { headers: BILIBILI_HEADERS });
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

    return c.json({ replies });
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

export default app;
