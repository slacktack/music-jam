// YouTube search without an API key, via the same JSON endpoint youtube.com's
// own search page uses. Results are played with the official IFrame embed.
// This endpoint is unofficial and can change; if search breaks, check here first.

const CLIENT = { clientName: 'WEB', clientVersion: '2.20251101.01.00', hl: 'en', gl: 'IN' };
const VIDEOS_ONLY = 'EgIQAQ%3D%3D'; // sp= filter for "videos"
const cache = new Map();
const TTL = 30 * 60 * 1000;

const text = (t) => (t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? '').trim();

function toSeconds(s) {
  if (!s) return 0;
  return s.split(':').reduce((acc, n) => acc * 60 + Number(n), 0) || 0;
}

function collect(node, out) {
  if (!node || typeof node !== 'object' || out.length >= 140) return;
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
      published: text(v.publishedTimeText),
      live,
    });
    return;
  }
  for (const k in node) collect(node[k], out);
}

/** YouTube hands back a paging token in one of two shapes depending on the build. */
function findToken(node, seen = { token: '' }) {
  if (!node || typeof node !== 'object' || seen.token) return seen.token;
  if (Array.isArray(node)) {
    for (const n of node) {
      const t = findToken(n, seen);
      if (t) return t;
    }
    return '';
  }
  const c = node.nextContinuationData?.continuation ?? node.continuationCommand?.token;
  if (typeof c === 'string' && c.length > 20) return c;
  for (const k in node) {
    const t = findToken(node[k], seen);
    if (t) return t;
  }
  return '';
}

async function viaApi(body) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept-language': 'en-IN,en;q=0.9,hi;q=0.8' },
    body: JSON.stringify({ context: { client: CLIENT }, ...body }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`youtubei ${res.status}`);
  const data = await res.json();
  const items = [];
  collect(data, items);
  return { items, token: findToken(data) };
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
  return { items: out, token: '' };
}

async function search(rawQuery) {
  const q = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!q) return { items: [], token: '' };
  try {
    const first = await viaApi({ query: q, params: decodeURIComponent(VIDEOS_ONLY) });
    if (!first.items.length) return await viaHtml(q);
    // One page is ~20 videos. Grab a second when the first is thin, which is what
    // keeps a section's queue long enough to shuffle through.
    if (first.token && first.items.length < 30) {
      const more = await viaApi({ continuation: first.token }).catch(() => ({ items: [] }));
      first.items.push(...more.items);
    }
    return first;
  } catch {
    return await viaHtml(q);
  }
}

// oEmbed answers 401/403 for videos whose owners disabled embedding; those
// would only error in our player, so drop them up front.
const embedCache = new Map();
async function embeddable(id) {
  if (embedCache.has(id)) return embedCache.get(id);
  let ok = true;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(3000) });
    ok = r.status !== 401 && r.status !== 403 && r.status !== 404;
  } catch {}
  if (embedCache.size > 8000) embedCache.clear();
  embedCache.set(id, ok);
  return ok;
}

/** Check in small batches and stop once enough survive, instead of probing every id. */
async function keepEmbeddable(items, want, cap) {
  const out = [];
  for (let i = 0; i < items.length && out.length < Math.min(want, cap); i += 12) {
    const chunk = items.slice(i, i + 12);
    const ok = await Promise.all(chunk.map((v) => embeddable(v.id)));
    chunk.forEach((v, k) => ok[k] && out.length < Math.min(want, cap) && out.push(v));
  }
  return out;
}

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((v) => v.id && !seen.has(v.id) && seen.add(v.id));
};

/**
 * Songs: individual tracks only — no shorts, no multi-hour compilations.
 * @returns {Promise<{items: object[], token: string}>} token pages the rest of this query.
 */
export async function searchYouTube(rawQuery) {
  const q = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!q) return { items: [], token: '' };
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.res;
  const { items, token } = await search(q);
  const pool = dedupe(items).filter((v) => v.title && (v.live || (v.duration >= 60 && v.duration <= 60 * 20)));
  const res = { items: await keepEmbeddable(pool, 45, pool.length), token };
  if (cache.size > 500) cache.clear();
  if (res.items.length) cache.set(key, { t: Date.now(), res }); // never cache a hiccup
  return res;
}

/** Whole videos for the Tube section: anything but sub-minute clips, no embed filter. */
export async function listVideos(rawQuery, token) {
  const q = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!q && !token) return { items: [], token: '' };
  let page;
  try {
    page = token ? await viaApi({ continuation: token }) : await search(q);
  } catch {
    page = { items: [], token: '' };
  }
  const items = dedupe(page.items).filter((v) => v.title && (v.live || v.duration === 0 || v.duration >= 60)).slice(0, 60);
  return { items, token: page.token };
}

/** Search-box autocomplete. Google's suggest endpoint answers for YouTube when ds=yt. */
export async function suggest(rawQuery) {
  const q = String(rawQuery || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!q) return [];
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&gl=in&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { 'accept-language': 'en-IN,en;q=0.9' } });
    const data = await res.json();
    const list = Array.isArray(data?.[1]) ? data[1] : [];
    return list.map((s) => (typeof s === 'string' ? s : s?.[0])).filter((s) => typeof s === 'string' && s.trim() && s.toLowerCase() !== q.toLowerCase()).slice(0, 10);
  } catch {
    return [];
  }
}

const send = (res, code, body, cacheControl) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
  res.statusCode = code;
  res.end(JSON.stringify(body));
};

/** Node-style (req, url) core, shared by the Vercel functions, the Node server and Vite dev. */
async function respond(pathname, params, res) {
  if (pathname === '/api/suggest') {
    const items = await suggest(params.get('q') || '');
    return send(res, 200, { items }, items.length ? 'public, max-age=120' : 'no-store');
  }
  if (pathname === '/api/videos') {
    const token = params.get('c') || '';
    const { items, token: next } = await listVideos(params.get('q') || '', token);
    return send(res, 200, { items, token: next }, token || !items.length ? 'no-store' : 'public, max-age=300, s-maxage=900');
  }
  const { items, token } = await searchYouTube(params.get('q') || '');
  return send(res, 200, { items, token }, items.length ? 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' : 'no-store');
}

/** Node-style (req, res) handler shared by Vercel, the Node server and the Vite dev server. */
export async function handleSearch(req, res) {
  const url = new URL(req.url, 'http://x');
  try {
    await respond(url.pathname.replace(/^\/api\/(videos|search|suggest)$/, '/api/$1'), url.searchParams, res);
  } catch {
    send(res, 502, { items: [], token: '', error: 'search_failed' });
  }
}

/** Vercel-style handler factory: one function, three paths. */
export const apiHandler = (pathname) => async (req, res) => {
  try {
    await respond(pathname, new URL(req.url, 'http://x').searchParams, res);
  } catch {
    send(res, 502, { items: [], token: '', error: 'search_failed' });
  }
};
