// YouTube search without an API key, via the same JSON endpoint youtube.com's
// own search page uses. Results are played with the official IFrame embed.
// This endpoint is unofficial and can change; if search breaks, check here first.

const CLIENT = { clientName: 'WEB', clientVersion: '2.20251101.01.00', hl: 'en', gl: 'IN' };
const VIDEOS_ONLY = 'EgIQAQ%3D%3D';
const cache = new Map();
const TTL = 30 * 60 * 1000;

const text = (t) => (t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? '').trim();

function toSeconds(s) {
  if (!s) return 0;
  return s.split(':').reduce((acc, n) => acc * 60 + Number(n), 0) || 0;
}

function collect(node, out) {
  if (!node || typeof node !== 'object' || out.length >= 60) return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out);
    return;
  }
  const v = node.videoRenderer;
  if (v?.videoId) {
    const length = text(v.lengthText);
    const live = !length && /live/i.test(JSON.stringify(v.badges || v.thumbnailOverlays || ''));
    out.push({
      id: v.videoId,
      title: text(v.title),
      channel: text(v.ownerText || v.longBylineText || v.shortBylineText),
      duration: toSeconds(length),
      views: text(v.shortViewCountText || v.viewCountText),
      live,
    });
    return;
  }
  for (const k in node) collect(node[k], out);
}

async function viaApi(q) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept-language': 'en-IN,en;q=0.9,hi;q=0.8' },
    body: JSON.stringify({ context: { client: CLIENT }, query: q, params: decodeURIComponent(VIDEOS_ONLY) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`youtubei ${res.status}`);
  const out = [];
  collect(await res.json(), out);
  return out;
}

async function viaHtml(q) {
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${VIDEOS_ONLY}&hl=en&gl=IN`, {
    headers: { 'accept-language': 'en-IN,en;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error('no ytInitialData');
  const out = [];
  collect(JSON.parse(m[1]), out);
  return out;
}

export async function searchYouTube(rawQuery) {
  const q = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!q) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.items;
  let items;
  try {
    items = await viaApi(q);
    if (!items.length) items = await viaHtml(q);
  } catch {
    items = await viaHtml(q);
  }
  // Skip shorts and multi-hour compilations; keep live streams.
  items = items.filter((v) => v.title && (v.live || (v.duration >= 60 && v.duration <= 60 * 20)));
  const seen = new Set();
  items = items.filter((v) => !seen.has(v.id) && seen.add(v.id)).slice(0, 40);
  if (cache.size > 500) cache.clear();
  cache.set(key, { t: Date.now(), items });
  return items;
}

/** Node-style (req, res) handler shared by Vercel, the Node server and the Vite dev server. */
export async function handleSearch(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const items = await searchYouTube(q);
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(JSON.stringify({ items }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ items: [], error: 'search_failed' }));
  }
}
