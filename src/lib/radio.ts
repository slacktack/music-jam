// Radio Browser (https://www.radio-browser.info): free community index of ~50k
// internet radio streams. No key. CORS enabled, so it's called from the browser.
import type { Track } from './types';
import type { Query } from './catalog';

const HOSTS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'all.api.radio-browser.info'];
let goodHost: string | null = null;

async function api(path: string, params: Query, signal?: AbortSignal): Promise<any[]> {
  const qs = new URLSearchParams(params).toString();
  const hosts = goodHost ? [goodHost, ...HOSTS.filter((h) => h !== goodHost)] : HOSTS;
  let lastErr: unknown;
  for (const host of hosts) {
    const timeout = AbortSignal.timeout(7000);
    try {
      const res = await fetch(`https://${host}${path}?${qs}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      goodHost = host;
      return await res.json();
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

const PLAYABLE = /^(mp3|aac|aac\+|ogg|opus|flac)/i;

function toTrack(r: any): Track | null {
  const url: string = r.url_resolved || r.url || '';
  // Names are user-submitted and often padded with junk like "# - ---> ".
  const title = String(r.name || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!url.startsWith('https://') || !title) return null;
  if (!r.hls && r.codec && !PLAYABLE.test(r.codec)) return null;
  const tags = String(r.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3).join(' · ');
  return {
    id: r.stationuuid,
    kind: 'radio',
    title,
    subtitle: tags || r.country || 'Live radio',
    url,
    art: typeof r.favicon === 'string' && r.favicon.startsWith('https://') ? r.favicon : '',
    hls: !!r.hls,
    live: true,
  };
}

const BASE: Query = { hidebroken: 'true', is_https: 'true', limit: '50' };
const cache = new Map<string, Track[]>();

export async function stationsFor(queries: Query[], signal?: AbortSignal): Promise<Track[]> {
  const key = JSON.stringify(queries);
  const hit = cache.get(key);
  if (hit) return hit;
  const results = await Promise.allSettled(queries.map((q) => api('/json/stations/search', { ...BASE, ...q }, signal)));
  const lists = results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled').map((r) => r.value);
  if (!lists.length) throw (results[0] as PromiseRejectedResult).reason;
  // Interleave so every query gets a fair share at the top, and de-dupe.
  const out: Track[] = [];
  const seen = new Set<string>();
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const s = list[i] && toTrack(list[i]);
      if (!s) continue;
      const k = s.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (seen.has(s.id) || seen.has(k) || seen.has(s.url)) continue;
      seen.add(s.id).add(k).add(s.url);
      out.push(s);
    }
  }
  const list = out.slice(0, 90);
  cache.set(key, list);
  return list;
}

export function searchStations(term: string, signal?: AbortSignal) {
  const t = term.toLowerCase();
  return stationsFor([{ order: 'clickcount', reverse: 'true', name: term }, { order: 'clickcount', reverse: 'true', tag: t }, { order: 'clickcount', reverse: 'true', language: t }], signal);
}

/** Directory etiquette: report a play (feeds their trending data). */
export function reportClick(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  api(`/json/url/${id}`, {}).catch(() => {});
}

export async function stationById(id: string): Promise<Track | null> {
  const list = await api(`/json/stations/byuuid/${encodeURIComponent(id)}`, {});
  return (list[0] && toTrack(list[0])) || null;
}
