// Cloudflare Pages Function — Bangumi API 代理
// 搜索中文名 + 并行 v0 详情 → 精简返回
const CACHE_TTL = 600; // 边缘缓存 10 分钟，降低 Bangumi 限流压力

export async function onRequest(context) {
  const { request, ctx } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return json({ error: 'Missing q' }, 400);
  }

  // 边缘缓存：相同搜索词直接命中，不再请求 Bangumi
  const cacheKey = new Request(url.href, { method: 'GET' });
  const cached = await caches.default.match(cacheKey).catch(() => null);
  if (cached) return cached;

  try {
    // 全局超时 8s，超过则返回已有数据而非崩溃
    const globalTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 8000)
    );

    const result = await Promise.race([globalTimeout, (async () => {
    // 第一步：搜索（取前 10 个结果，提高主系列命中率）
    const searchUrl = 'https://api.bgm.tv/search/subject/' + encodeURIComponent(q.trim())
      + '?type=2&responseGroup=small&max_results=10';
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'AnimeTracker/1.0' },
      signal: AbortSignal.timeout(4000)
    });

    // 限流 / 被拒：返回可辨识错误且不缓存
    if (searchRes.status === 429 || searchRes.status === 403) {
      return json({ list: [], error: 'bangumi_rate_limited' }, 502, { 'Cache-Control': 'no-store' });
    }
    if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const items = (searchData.list || []).filter(i => i.type === 2);

    if (items.length === 0) {
      return json({ list: [] });
    }

    // 第二步：并行获取 v0 详情（1.5s 超时，降级数据足够用）
    const enriched = await Promise.all(items.map(async (item) => {
      try {
        const detailRes = await fetch(`https://api.bgm.tv/v0/subjects/${item.id}`, {
          headers: { 'User-Agent': 'AnimeTracker/1.0' },
          signal: AbortSignal.timeout(1500)
        });
        if (!detailRes.ok) throw new Error(`v0 HTTP ${detailRes.status}`);
        const d = await detailRes.json();
        return {
          id: item.id,
          type: 2,
          name: item.name,
          name_cn: item.name_cn,
          eps: d.eps || 0,
          eps_count: d.eps || 0,
          score: d.rating?.score ? d.rating.score.toFixed(1) : '',
          air_date: d.date || item.air_date || '',
          thumb: fixImg(d.images?.grid || d.images?.small || item.images?.grid || item.images?.small),
          poster: fixImg(d.images?.large || item.images?.large),
        };
      } catch (e) {
        // 降级：只用搜索 API 数据
        return {
          id: item.id,
          type: 2,
          name: item.name,
          name_cn: item.name_cn,
          eps: 0,
          eps_count: 0,
          score: item.rating?.score ? item.rating.score.toFixed(1) : '',
          air_date: item.air_date || '',
          thumb: fixImg(item.images?.grid || item.images?.small),
          poster: fixImg(item.images?.large),
        };
      }
    }));

    const resp = json(
      { list: enriched },
      200,
      { 'Cache-Control': `public, max-age=${CACHE_TTL}` }
    );
    // 写入边缘缓存（失败不影响响应）
    ctx.waitUntil(caches.default.put(cacheKey, resp.clone()).catch(() => {}));
    return resp;
    })()]);  // 结束 async IIFE 和 Promise.race

    return result;
  } catch (err) {
    if (err.message === 'timeout') return json({ list: [] });
    return json({ error: err.message }, 500);
  }
}

function fixImg(url) {
  if (!url) return '';
  url = url.replace(/^http:\/\//, 'https://');
  url = url.replace(/^https:\/\/lain\.bgm\.tv\//, '/bgm-img/');
  return url;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}