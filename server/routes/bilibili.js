import { Hono } from 'hono';
import crypto from 'crypto';

const app = new Hono();

const BILIBILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com',
};

// ===== buvid3 缓存 =====
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
      buvid3Expire = Date.now() + 3600 * 1000;
      return cachedBuvid3;
    }
  } catch {}
  return '';
}

async function getBuvid4() {
  try {
    const res = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: BILIBILI_HEADERS,
    });
    const json = await res.json();
    return json.data?.b_4 || '';
  } catch {}
  return '';
}

async function bilibiliFetch(url) {
  const buvid3 = await getBuvid3();
  const headers = { ...BILIBILI_HEADERS };
  if (buvid3) headers.Cookie = `buvid3=${buvid3}`;
  return fetch(url, { headers });
}

// ===== WBI 签名（用于搜索 API） =====
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 36, 25, 1, 51, 17, 4, 52,
  34, 7, 48, 0, 55, 20, 57, 22, 11, 26, 44, 6, 40, 21, 24, 16, 30, 54, 56, 59,
];

let cachedWbiKeys = null;
let wbiKeysExpire = 0;

async function getWbiKeys() {
  if (cachedWbiKeys && Date.now() < wbiKeysExpire) return cachedWbiKeys;
  try {
    const buvid3 = await getBuvid3();
    const buvid4 = await getBuvid4();
    const headers = { ...BILIBILI_HEADERS };
    if (buvid3) headers.Cookie = `buvid3=${buvid3}; buvid4=${buvid4}`;
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers,
    });
    const json = await res.json();
    const img = json.data?.wbi_img?.img_url || '';
    const sub = json.data?.wbi_img?.sub_url || '';
    const imgKey = img.substring(img.lastIndexOf('/') + 1).split('.')[0] || '';
    const subKey = sub.substring(sub.lastIndexOf('/') + 1).split('.')[0] || '';
    if (imgKey && subKey) {
      cachedWbiKeys = { imgKey, subKey };
      wbiKeysExpire = Date.now() + 3600 * 1000;
      return cachedWbiKeys;
    }
  } catch {}
  return null;
}

function getMixinKey(imgKey, subKey) {
  const raw = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i]).join('').slice(0, 32);
}

function wbiSign(params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey, subKey);
  const wts = Math.floor(Date.now() / 1000);
  const allParams = { ...params, wts };
  const query = Object.keys(allParams)
    .sort()
    .map((k) => `${k}=${allParams[k]}`)
    .join('&');
  const wRid = crypto.createHash('md5').update(query + mixinKey).digest('hex');
  return { ...allParams, w_rid: wRid };
}

// ===== 搜索我的世界视频 =====
async function searchMinecraftVideos(page = 1) {
  try {
    const wbi = await getWbiKeys();
    if (!wbi) return [];

    // 使用英文关键词 "Minecraft" 搜索（中文关键词在服务器 IP 上被限制）
    const params = {
      keyword: 'Minecraft',
      search_type: 'video',
      order: 'totalrank',
      duration: '0',
      tids: '0',
      page: String(page),
      page_size: '20',
    };
    const signed = wbiSign(params, wbi.imgKey, wbi.subKey);
    const query = new URLSearchParams(signed).toString();
    const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?${query}`;

    const buvid3 = await getBuvid3();
    const headers = { ...BILIBILI_HEADERS };
    if (buvid3) headers.Cookie = `buvid3=${buvid3}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.code !== 0) return [];

    const results = json.data?.result || [];
    return results.map((v) => ({
      bvid: v.bvid,
      title: (v.title || '').replace(/<[^>]+>/g, ''),
      pic: v.pic?.startsWith('//') ? 'https:' + v.pic : v.pic,
      duration: v.duration,
      owner: { name: v.author, mid: v.mid, face: v.upic },
      stat: {
        view: v.play,
        like: v.like,
        danmaku: v.video_review,
        reply: v.review,
      },
      desc: v.description || '',
      aid: v.aid,
    }));
  } catch {
    return [];
  }
}

// ===== 获取热门视频 =====
async function getPopularVideos(page) {
  const url = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=${page}`;
  const res = await bilibiliFetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  if (json.code !== 0) return [];

  return (json.data?.list || []).map((v) => ({
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
}

function shuffle(arr) {
  return arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ v }) => v);
}

// ===== 格式化视频数据 =====
function formatVideo(v) {
  return {
    bvid: v.bvid,
    title: v.title,
    pic: v.pic,
    duration: v.duration,
    owner: v.owner,
    stat: v.stat,
    desc: v.desc,
    aid: v.aid,
  };
}

// GET /feed - 混合推送：我的世界 + 热门
app.get('/feed', async (c) => {
  try {
    // 随机决定混合比例：60% 我的世界，40% 热门
    const mcPage = Math.floor(Math.random() * 5) + 1;
    const popPage = Math.floor(Math.random() * 20) + 1;

    const [mcVideos, popVideos] = await Promise.all([
      searchMinecraftVideos(mcPage),
      getPopularVideos(popPage),
    ]);

    // 合并去重
    const seen = new Set();
    let combined = [];

    // 先放我的世界视频
    for (const v of shuffle(mcVideos)) {
      if (v.bvid && !seen.has(v.bvid)) {
        seen.add(v.bvid);
        combined.push(formatVideo(v));
      }
    }
    // 再加热门视频补充
    for (const v of shuffle(popVideos)) {
      if (v.bvid && !seen.has(v.bvid)) {
        seen.add(v.bvid);
        combined.push(formatVideo(v));
      }
    }

    // 最后整体打乱，但我的世界视频占比更高
    combined = shuffle(combined);

    return c.json({ videos: combined });
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
    if (!res.ok) return c.json({ error: `Bilibili API ${res.status}` }, 502);
    const json = await res.json();
    return c.json(json);
  } catch (err) {
    return c.json({ error: err.message || '服务器内部错误' }, 500);
  }
});

// GET /comments/:aid - 获取评论
app.get('/comments/:aid', async (c) => {
  try {
    const { aid } = c.req.param();
    const page = parseInt(c.req.query('page') || '1', 10) || 1;
    const url = `https://api.bilibili.com/x/v2/reply?type=1&oid=${encodeURIComponent(aid)}&sort=2&pn=${page}&ps=20`;
    const res = await bilibiliFetch(url);
    if (!res.ok) return c.json({ error: `Bilibili API ${res.status}` }, 502);
    const json = await res.json();
    if (json.code !== 0)
      return c.json({ error: json.message || '获取评论失败', code: json.code }, 502);

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
