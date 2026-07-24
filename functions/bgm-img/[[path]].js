// Cloudflare Pages Function — Bangumi 图片代理
// 代理 lain.bgm.tv 的图片（国内被墙），通过 /bgm-img/* 路径访问
export async function onRequest(context) {
  const { request, params } = context;

  // [[path]] catch-all 返回数组，用 / 拼接还原原始路径
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path;

  const bgmUrl = 'https://lain.bgm.tv/' + path;

  try {
    const response = await fetch(bgmUrl, {
      headers: {
        'User-Agent': 'AnimeTracker/1.0',
        // 透传客户端的图片格式偏好
        'Accept': request.headers.get('Accept') || 'image/*',
      },
    });

    if (!response.ok) {
      return new Response('Image not found', { status: 404 });
    }

    // 透传原始响应的 body 和 content-type，Cloudflare 自动边缘缓存
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 502 });
  }
}
