// Cloudflare Pages Function — Bangumi API 代理
// 搜索中文名 + 并行 v0 详情 → 精简返回
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return json({ error: 'Missing q' }, 400);
  }

  try {
    // 第一步：搜索（取前 10 个结果，提高主系列命中率）
    const searchUrl = 'https://api.bgm.tv/search/subject/' + encodeURIComponent(q.trim())
      + '?type=2&responseGroup=small&max_results=10';
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'AnimeTracker/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const items = (searchData.list || []).filter(i => i.type === 2);

    if (items.length === 0) {
      return json({ list: [] });
    }

    // 第二步：并行获取 v0 详情（2s 超时，避免函数总耗时超限）
    const enriched = await Promise.all(items.map(async (item) => {
      try {
        const detailRes = await fetch(`https://api.bgm.tv/v0/subjects/${item.id}`, {
          headers: { 'User-Agent': 'AnimeTracker/1.0' },
          signal: AbortSignal.timeout(2000)
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

    return json(
      { list: enriched },
      200,
      { 'Cache-Control': 'public, max-age=600' }
    );
  } catch (err) {
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
