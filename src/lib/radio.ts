// Station directory: Radio Browser (https://www.radio-browser.info), a free
// community index of ~50k internet radio streams. No key needed.
import type { Station } from './types';
import { PALETTE } from './color';

type Query = Record<string, string>;

export interface Vibe {
  id: string;
  label: string;
  color: string;
  queries: Query[];
}

const top = (q: Query): Query => ({ order: 'clickcount', reverse: 'true', ...q });

export const VIBES: Vibe[] = [
  { id: 'trending', label: 'Trending', color: PALETTE.red, queries: [{ order: 'clicktrend', reverse: 'true' }] },
  { id: 'hindi', label: 'Hindi', color: PALETTE.amber, queries: [top({ language: 'hindi' }), top({ tag: 'hindi' })] },
  {
    id: 'retro-hindi', label: 'Retro Hindi', color: PALETTE.orange,
    queries: [
      top({ countrycode: 'IN', name: 'retro' }), top({ language: 'hindi', name: '90' }),
      top({ language: 'hindi', name: 'gold' }), top({ language: 'hindi', tag: 'retro' }),
      top({ name: 'kishore' }), top({ countrycode: 'IN', name: 'rafi' }), top({ countrycode: 'IN', name: 'lata' }),
      top({ language: 'hindi', tag: '90s' }), top({ name: 'vividh' }), top({ language: 'hindi', tag: 'old' }),
      top({ tag: 'bollywood', name: 'nostalgi' }),
    ],
  },
  { id: 'bollywood', label: 'Bollywood', color: PALETTE.magenta, queries: [top({ tag: 'bollywood' })] },
  { id: 'punjabi', label: 'Punjabi', color: PALETTE.phosphor, queries: [top({ language: 'punjabi' }), top({ tag: 'punjabi' }), top({ name: 'punjabi' })] },
  { id: 'english', label: 'English Hits', color: PALETTE.indigo, queries: [top({ language: 'english', tag: 'hits' }), top({ language: 'english', tag: 'pop' }), top({ language: 'english', tag: 'top 40' })] },
  { id: 'lofi', label: 'Lo-fi', color: PALETTE.violet, queries: [top({ tag: 'lofi' }), top({ tag: 'lo-fi' }), top({ tag: 'chillhop' })] },
  { id: 'hiphop', label: 'Hip-hop', color: PALETTE.red, queries: [top({ tag: 'hip hop' }), top({ tag: 'hiphop' }), top({ tag: 'rap' })] },
  { id: 'electronic', label: 'Electronic', color: PALETTE.cyan, queries: [top({ tag: 'electronic' })] },
  { id: 'house', label: 'House', color: PALETTE.indigo, queries: [top({ tag: 'house' })] },
  { id: 'techno', label: 'Techno', color: PALETTE.phosphor, queries: [top({ tag: 'techno' })] },
  { id: 'ghazal', label: 'Ghazal & Sufi', color: PALETTE.amber, queries: [top({ tag: 'ghazal' }), top({ tag: 'sufi' }), top({ tag: 'qawwali' })] },
  { id: 'tamil', label: 'Tamil', color: PALETTE.orange, queries: [top({ language: 'tamil' })] },
  { id: 'rock', label: 'Rock', color: PALETTE.red, queries: [top({ tag: 'rock' })] },
  { id: 'jazz', label: 'Jazz', color: PALETTE.amber, queries: [top({ tag: 'jazz' })] },
  { id: 'chill', label: 'Chill', color: PALETTE.cyan, queries: [top({ tag: 'chillout' }), top({ tag: 'ambient' })] },
  { id: '90s', label: '90s', color: PALETTE.magenta, queries: [top({ tag: '90s' })] },
  { id: 'kpop', label: 'K-pop', color: PALETTE.violet, queries: [top({ tag: 'kpop' }), top({ tag: 'k-pop' })] },
  { id: 'synthwave', label: 'Synthwave', color: PALETTE.magenta, queries: [top({ tag: 'synthwave' }), top({ tag: 'retrowave' })] },
  { id: 'dnb', label: 'Drum & Bass', color: PALETTE.phosphor, queries: [top({ tag: 'drum and bass' }), top({ tag: 'dnb' })] },
  { id: 'reggae', label: 'Reggae', color: PALETTE.phosphor, queries: [top({ tag: 'reggae' })] },
  { id: 'latin', label: 'Latin', color: PALETTE.orange, queries: [top({ tag: 'latin' }), top({ tag: 'reggaeton' })] },
  { id: 'classical', label: 'Classical', color: PALETTE.indigo, queries: [top({ tag: 'classical' })] },
  { id: 'metal', label: 'Metal', color: PALETTE.red, queries: [top({ tag: 'metal' })] },
];

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

function toStation(r: any): Station | null {
  const url: string = r.url_resolved || r.url || '';
  // Directory names are user-submitted and often padded with junk like "# - ---> ".
  const name = String(r.name || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!url.startsWith('https://') || !name) return null;
  if (!r.hls && r.codec && !PLAYABLE.test(r.codec)) return null;
  return {
    id: r.stationuuid,
    name,
    url,
    favicon: typeof r.favicon === 'string' && r.favicon.startsWith('https://') ? r.favicon : '',
    tags: (r.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 4).join(', '),
    country: r.country || '',
    hls: !!r.hls,
    codec: r.codec,
    bitrate: r.bitrate,
  };
}

const BASE: Query = { hidebroken: 'true', is_https: 'true', limit: '60' };

async function runQueries(queries: Query[], signal?: AbortSignal): Promise<Station[]> {
  const results = await Promise.allSettled(queries.map((q) => api('/json/stations/search', { ...BASE, ...q }, signal)));
  const lists = results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled').map((r) => r.value);
  if (!lists.length) throw (results[0] as PromiseRejectedResult).reason;
  // Interleave the result lists so every query gets a fair share up top.
  const out: Station[] = [];
  const seen = new Set<string>();
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const s = list[i] && toStation(list[i]);
      if (!s) continue;
      const key = s.name.toLowerCase().replace(/[^a-z0-9ऀ-ॿ਀-੿]/g, '');
      if (seen.has(s.id) || seen.has(key) || seen.has(s.url)) continue;
      seen.add(s.id).add(key).add(s.url);
      out.push(s);
    }
  }
  return out.slice(0, 120);
}

export async function fetchVibe(vibe: Vibe, signal?: AbortSignal): Promise<Station[]> {
  return runQueries(vibe.queries, signal);
}

export async function searchStations(term: string, signal?: AbortSignal): Promise<Station[]> {
  return runQueries([top({ name: term }), top({ tag: term.toLowerCase() }), top({ language: term.toLowerCase() })], signal);
}

/** Be a good citizen: tell the directory a station got played (feeds its trending data). */
export function reportClick(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  api(`/json/url/${id}`, {}).catch(() => {});
}

// Shown only when the directory can't be reached. SomaFM: listener-supported, commercial-free.
const soma = (slug: string, name: string, tags: string): Station => ({
  id: `soma-${slug}`, name: `SomaFM ${name}`, url: `https://ice1.somafm.com/${slug}-128-mp3`, favicon: '', tags, country: 'USA', hls: false,
});
export const FALLBACK: Station[] = [
  soma('groovesalad', 'Groove Salad', 'ambient, downtempo'),
  soma('dronezone', 'Drone Zone', 'ambient, space'),
  soma('defcon', 'DEF CON Radio', 'electronic, hacking'),
  soma('secretagent', 'Secret Agent', 'lounge, spy'),
  soma('lush', 'Lush', 'vocal, electronic'),
  soma('indiepop', 'Indie Pop Rocks!', 'indie, pop'),
  soma('beatblender', 'Beat Blender', 'house, downtempo'),
  soma('deepspaceone', 'Deep Space One', 'ambient, space'),
  soma('spacestation', 'Space Station Soma', 'electronic, mid-tempo'),
  soma('fluid', 'Fluid', 'hip hop, instrumental'),
  soma('poptron', 'PopTron', 'electropop, indie dance'),
  soma('vaporwaves', 'Vaporwaves', 'vaporwave'),
  soma('thetrip', 'The Trip', 'progressive house, trance'),
  soma('u80s', 'Underground 80s', '80s, synthpop'),
  soma('7soul', 'Seven Inch Soul', 'soul, vintage'),
  soma('sonicuniverse', 'Sonic Universe', 'jazz, eclectic'),
  soma('reggae', 'Heavyweight Reggae', 'reggae, dub'),
  soma('metal', 'Metal Detector', 'metal'),
];
