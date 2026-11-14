// Songs come from YouTube via our /api/search function and play in the official embed.
import type { Track } from './types';

interface Item { id: string; title: string; channel: string; duration: number; views: string; live: boolean }

const cache = new Map<string, Track[]>();

/** "Kesariya - Full Song | Brahmastra | Arijit Singh" -> "Kesariya" */
export function cleanTitle(t: string) {
  const s = t
    .replace(/\[[^\]]*\]|\((?:official|full|lyric|lyrical|video|audio|hd|4k|song)[^)]*\)/gi, '')
    .replace(/#\S+/g, '')
    .replace(/\b(official\s+(music\s+)?video|full\s+(video\s+)?song|lyrical(\s+video)?|full\s+video|video\s+song|audio\s+song|official\s+audio)\b/gi, '')
    .split(/\s[|｜]\s|\s[-–—]\s/)
    .map((x) => x.trim())
    .filter(Boolean)[0];
  return (s || t).replace(/\s+/g, ' ').replace(/^['"“]|['"”]$/g, '').trim().slice(0, 90);
}

export const thumb = (id: string, q: 'mq' | 'hq' | 'sd' = 'hq') => `https://i.ytimg.com/vi/${id}/${q}default.jpg`;

export async function searchSongs(q: string, signal?: AbortSignal): Promise<Track[]> {
  const key = q.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const { items } = (await res.json()) as { items: Item[] };
  const list: Track[] = items.map((v) => ({
    id: `yt:${v.id}`,
    kind: 'song',
    title: cleanTitle(v.title),
    subtitle: v.channel,
    url: v.id,
    art: thumb(v.id, 'mq'),
    duration: v.duration,
    live: v.live,
  }));
  cache.set(key, list);
  return list;
}
