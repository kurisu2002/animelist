// Cloudflare Pages Function: 随机动漫台词代理

let pool = [];
let filling = false;

const FALLBACKS = [
  { hitokoto: '人は誰でも、自分が思っているより強くなれる。', from: '火影忍者' },
  { hitokoto: '諦めたらそこで試合終了ですよ。', from: 'SLAM DUNK' },
  { hitokoto: '人間は、自分の生き方を自分で決めることができる。', from: '新世紀エヴァンゲリオン' },
  { hitokoto: '何があっても、明日はやってくる。', from: 'ワンピース' },
  { hitokoto: 'この世界には、知らない方がいいこともあるんだ。', from: '鋼の錬金術師' },
  { hitokoto: '人は一人では生きられない。', from: 'CLANNAD' },
  { hitokoto: '大切な人は、いつもそばにいる。', from: 'AIR' },
];

async function fetchOne(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      signal: ctrl.signal,
    });
    const data = await res.json();
    return data.hitokoto ? { hitokoto: data.hitokoto, from: data.from } : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function refillPool() {
  if (filling) return;
  filling = true;
  const ts = Date.now();
  const cats = ['a', 'b', 'c', 'e', 'h'];
  const jobs = cats.map(c => fetchOne('https://v1.hitokoto.cn/?c=' + c + '&encode=json&_t=' + ts + '_' + c));
  jobs.push(fetchOne('https://hi.logacg.com/?c=b&_t=' + ts));

  const results = await Promise.allSettled(jobs);
  const fresh = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && !fresh.find(q => q.hitokoto === r.value.hitokoto)) {
      fresh.push(r.value);
    }
  }
  // 随机打乱
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  pool = pool.concat(fresh);
  filling = false;
}

export async function onRequest() {
  // 优先从池子取（瞬间返回）
  if (pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const result = pool.splice(idx, 1)[0];

    // 后台补货
    if (pool.length < 5) refillPool();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, no-cache, max-age=0', 'CDN-Cache-Control': 'no-store, max-age=0' },
    });
  }

  // 池子空的（冷启动）——直接拉一条返回，不等补货
  refillPool(); // 后台补货，后续请求受益

  const ts = Date.now();
  const result = await fetchOne('https://v1.hitokoto.cn/?c=b&encode=json&_t=' + ts);
  const final = result || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];

  return new Response(JSON.stringify(final), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, no-cache, max-age=0', 'CDN-Cache-Control': 'no-store, max-age=0' },
  });
}
