// Songs come from YouTube via our /api/search function and play in the official embed.
import type { Track } from './types';

interface Item { id: string; title: string; channel: string; duration: number; views: string; live: boolean }

const cache = new Map<string, Track[]>();

/** "Kesariya - Full Song | Brahmastra | Arijit Singh" -> "Kesariya" */
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;
export const noEmoji = (t: string) => t.replace(EMOJI, '').replace(/\s+/g, ' ').trim();

export function cleanTitle(t: string) {
  const s = noEmoji(t)
    .replace(/\[[^\]]*\]|\((?:official|full|lyric|lyrical|video|audio|hd|4k|song)[^)]*\)/gi, '')
    .replace(/#\S+/g, '')
    .replace(/\b(official\s+(music\s+)?video|full\s+(video\s+)?song|lyrical(\s+video)?|full\s+video|video\s+song|audio\s+song|official\s+audio)\b/gi, '')
    .split(/\s[|｜]\s|\s[-–—]\s/)
    .map((x) => x.trim())
    .filter(Boolean)[0];
  return (s || t).replace(/\s+/g, ' ').replace(/^['"“]|['"”]$/g, '').trim().slice(0, 90);
}

export const thumb = (id: string, q: 'mq' | 'hq' | 'sd' = 'hq') => `https://i.ytimg.com/vi/${id}/${q}default.jpg`;

/** A query can be several YouTube searches joined with "||"; results are interleaved. */
export async function searchSongs(q: string, signal?: AbortSignal): Promise<Track[]> {
  const parts = q.split('||').map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return searchOne(q, signal);
  const lists = await Promise.all(parts.map((p) => searchOne(p, signal).catch(() => [] as Track[])));
  const out: Track[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++)
    for (const l of lists) if (l[i] && !seen.has(l[i].id)) { seen.add(l[i].id); out.push(l[i]); }
  return out;
}

async function searchOne(q: string, signal?: AbortSignal): Promise<Track[]> {
  const key = q.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit) return hit;
  let items: Item[] = [];
  for (let attempt = 0; attempt < 2 && !items.length; attempt++) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok && attempt) throw new Error(`search ${res.status}`);
    if (res.ok) items = ((await res.json()) as { items: Item[] }).items;
  }
  const list: Track[] = items.map((v) => ({
    id: `yt:${v.id}`,
    kind: 'song',
    title: cleanTitle(v.title),
    subtitle: noEmoji(v.channel),
    url: v.id,
    art: thumb(v.id, 'mq'),
    duration: v.duration,
    live: v.live,
  }));
  if (list.length) cache.set(key, list);
  return list;
}
