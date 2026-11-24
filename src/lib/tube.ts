// The Tube section: browse whole YouTube, not just songs. Backed by /api/videos
// (search + continuation paging) and /api/suggest (the search box autocomplete).
import type { Track } from './types';
import { noEmoji } from './songs';

export interface VideoItem {
  id: string;
  title: string;
  channel: string;
  duration: number;
  views: string;
  published: string;
  live: boolean;
}

export interface Feed {
  label: string;
  query: string;
}

/** Same eleven shelves the Android build ships, plus the live one. */
export const FEEDS: Feed[] = [
  { label: 'For you', query: 'trending india today' },
  { label: 'Music', query: 'new music video' },
  { label: 'Cricket', query: 'cricket highlights' },
  { label: 'Comedy', query: 'stand up comedy india' },
  { label: 'Gaming', query: 'gaming' },
  { label: 'News', query: 'news live india' },
  { label: 'Tech', query: 'tech review' },
  { label: 'Podcasts', query: 'podcast hindi' },
  { label: 'Movies', query: 'official trailer' },
  { label: 'Fitness', query: 'workout at home' },
  { label: 'Food', query: 'street food india' },
  { label: 'Live', query: 'live now' },
];

export interface Page {
  items: Track[];
  token: string;
}

const toTrack = (v: VideoItem): Track => ({
  id: `yt:${v.id}`,
  kind: 'song',
  title: noEmoji(v.title).slice(0, 120),
  subtitle: noEmoji(v.channel),
  url: v.id,
  art: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
  duration: v.duration,
  live: v.live,
  video: true,
  views: v.views,
  published: v.published,
});

async function get(url: string, signal?: AbortSignal): Promise<Page> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = (await res.json()) as { items?: VideoItem[]; token?: string };
  return { items: (data.items ?? []).map(toTrack), token: data.token ?? '' };
}

export const videos = (q: string, signal?: AbortSignal) => get(`/api/videos?q=${encodeURIComponent(q)}`, signal);

/** Append the next page of the same query or feed. */
export const moreVideos = (token: string, signal?: AbortSignal) => get(`/api/videos?c=${encodeURIComponent(token)}`, signal);

const cache = new Map<string, string[]>();

/** Search-box completions, best effort — the box works without them. */
export async function suggest(q: string, signal?: AbortSignal): Promise<string[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const hit = cache.get(term.toLowerCase());
  if (hit) return hit;
  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal });
    if (!res.ok) return [];
    const items = ((await res.json()) as { items?: string[] }).items ?? [];
    if (items.length) cache.set(term.toLowerCase(), items);
    return items;
  } catch {
    return [];
  }
}
