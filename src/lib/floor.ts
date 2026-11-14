// The floor: one global space, no rooms. Presence, chat and reactions travel over
// public Nostr relays (plain WebSockets on 443), so the site needs no backend.
// Throwaway keys are generated per browser; nothing ties them to a real identity.
import { create } from 'zustand';
import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import type { ChatMsg, FloorSpot, FloorUser, Track } from './types';
import { COLORS } from './color';
import { isLive, usePlayer } from './player';
import { isReaction, type GlyphId } from './glyphs';
import { toast } from './toast';

const DEFAULT_RELAYS = 'wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.mom';
export const RELAYS = (import.meta.env.VITE_RELAYS || DEFAULT_RELAYS).split(',').map((s: string) => s.trim()).filter(Boolean);
const ROOM = import.meta.env.VITE_FLOOR || 'jam-floor-v2';
const K_PRESENCE = 30778; // parameterized replaceable: one current status per person
const K_CHAT = 4778; // regular, stored: chat history
const K_REACT = 24778; // ephemeral: never stored
const STALE_MS = 75_000;
const HEARTBEAT_MS = 25_000;

const ADJ = ['Neon', 'Velvet', 'Static', 'Lunar', 'Turbo', 'Hazy', 'Cosmic', 'Chrome', 'Desi', 'Midnight', 'Solar', 'Masala', 'Wavy', 'Filmi', 'Lofi', 'Analog'];
const NOUN = ['Tiger', 'Koel', 'Mango', 'Comet', 'Peacock', 'Panda', 'Dhol', 'Sitar', 'Lynx', 'Chai', 'Falcon', 'Tabla', 'Mor', 'Phantom', 'Baaz', 'Synth'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

interface Identity { name: string; color: string }

function store<T>(key: string, make: () => T, ok: (v: any) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const v = JSON.parse(raw); if (ok(v)) return v; }
  } catch {}
  const v = make();
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  return v;
}

const sk = hexToBytes(store('jam.sk', () => bytesToHex(generateSecretKey()), (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)));
const myId = getPublicKey(sk);

export interface Reaction { key: number; glyph: GlyphId; x: number; color: string }

interface FloorState {
  status: 'connecting' | 'live' | 'offline';
  relaysUp: number;
  myId: string;
  me: Identity;
  users: FloorUser[];
  spots: FloorSpot[];
  messages: ChatMsg[];
  reactions: Reaction[];
  unread: number;
  setIdentity: (patch: Partial<Identity>) => void;
  sendChat: (text: string) => Promise<boolean>;
  react: (g: GlyphId) => void;
  clearUnread: () => void;
}

const others = new Map<string, { user: FloorUser; seen: number; ts: number }>();
const seenIds = new Set<string>();
const bootAt = Math.floor(Date.now() / 1000);

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#5B5BFF');

function cleanTrack(x: any): Track | null {
  if (!x || typeof x !== 'object') return null;
  const kind = x.kind === 'song' ? 'song' : x.kind === 'radio' ? 'radio' : null;
  if (!kind) return null;
  const url = str(x.url, 500);
  if (kind === 'song' && !/^[\w-]{11}$/.test(url)) return null;
  if (kind === 'radio' && !/^https:\/\//i.test(url)) return null;
  const art = str(x.art, 500);
  return {
    id: kind === 'song' ? `yt:${url}` : str(x.id, 64) || url,
    kind,
    title: str(x.title, 90) || 'Untitled',
    subtitle: str(x.subtitle, 90),
    url,
    art: /^https:\/\//i.test(art) ? art : '',
    duration: Number.isFinite(x.duration) ? Math.max(0, Math.min(36000, x.duration)) : undefined,
    live: !!x.live,
    hls: !!x.hls,
  };
}

function myTrack(): { track: Track | null; at: number } {
  const { track, status, at } = usePlayer.getState();
  return track && isLive(status) ? { track, at } : { track: null, at: 0 };
}

export const useFloor = create<FloorState>((set, get) => ({
  status: 'connecting',
  relaysUp: 0,
  myId,
  me: store('jam.me', () => ({ name: `${pick(ADJ)}${pick(NOUN)}${Math.floor(Math.random() * 90 + 10)}`, color: pick(COLORS) }), (v) => v?.name && v?.color),
  users: [],
  spots: [],
  messages: [],
  reactions: [],
  unread: 0,
  setIdentity(patch) {
    const me = { ...get().me, ...patch };
    try { localStorage.setItem('jam.me', JSON.stringify(me)); } catch {}
    set({ me });
    recompute();
    schedulePresence(200);
  },
  async sendChat(text) {
    const t = str(text, 280);
    if (!t) return false;
    if (Date.now() - lastChat < 1200) { toast('Easy, one message a second.', 'info'); return false; }
    lastChat = Date.now();
    const { me } = get();
    const ev = sign(K_CHAT, JSON.stringify({ text: t, name: me.name, color: me.color, on: myTrack().track?.title || '' }));
    addChat(ev, false);
    const ok = await publish(ev);
    if (!ok) toast("Message didn't reach the floor. Check your connection.");
    return ok;
  },
  react(g) {
    if (Date.now() - lastReact < 350) return;
    lastReact = Date.now();
    const ev = sign(K_REACT, JSON.stringify({ g, c: get().me.color }));
    seenIds.add(ev.id);
    addReaction(g, get().me.color);
    publish(ev);
  },
  clearUnread: () => set({ unread: 0 }),
}));

let lastChat = 0;
let lastReact = 0;
let reactionKey = 0;
let lastPresenceTs = 0;
let lastOk = 0; // last time any relay answered us

function sign(kind: number, content: string): Event {
  const now = Math.floor(Date.now() / 1000);
  // Replaceable events need strictly increasing timestamps or relays keep the old one.
  const created_at = kind === K_PRESENCE ? Math.max(now, lastPresenceTs + 1) : now;
  if (kind === K_PRESENCE) lastPresenceTs = created_at;
  const tags = kind === K_PRESENCE ? [['d', ROOM], ['t', ROOM]] : [['t', ROOM]];
  return finalizeEvent({ kind, created_at, tags, content }, sk);
}

const pool = new SimplePool({ enableReconnect: true });

async function publish(ev: Event): Promise<boolean> {
  const results = await Promise.allSettled(pool.publish(RELAYS, ev));
  const ok = results.some((r) => r.status === 'fulfilled');
  if (ok) lastOk = Date.now();
  return ok;
}

function addReaction(glyph: GlyphId, c: string) {
  const r: Reaction = { key: ++reactionKey, glyph, x: 10 + Math.random() * 80, color: c };
  useFloor.setState((s) => ({ reactions: [...s.reactions.slice(-24), r] }));
  setTimeout(() => useFloor.setState((s) => ({ reactions: s.reactions.filter((x) => x.key !== r.key) })), 3400);
}

function addChat(ev: Event, countUnread: boolean) {
  if (seenIds.has(ev.id) && ev.pubkey !== myId) return;
  seenIds.add(ev.id);
  let c: any;
  try { c = JSON.parse(ev.content); } catch { return; }
  const text = str(c?.text, 280);
  if (!text) return;
  const msg: ChatMsg = { id: ev.id, user: { id: ev.pubkey, name: str(c.name, 24) || 'anon', color: color(c.color) }, text, on: str(c.on, 90), ts: ev.created_at * 1000 };
  useFloor.setState((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s;
    const messages = [...s.messages, msg].sort((a, b) => a.ts - b.ts).slice(-150);
    return { messages, unread: countUnread && ev.pubkey !== myId ? s.unread + 1 : s.unread };
  });
}

function onEvent(ev: Event) {
  lastOk = Date.now();
  if (!ev.tags.some((t) => t[0] === 't' && t[1] === ROOM)) return;
  const now = Math.floor(Date.now() / 1000);
  if (ev.kind === K_CHAT) return addChat(ev, ev.created_at >= bootAt);
  if (seenIds.has(ev.id)) return;
  seenIds.add(ev.id);
  if (seenIds.size > 5000) seenIds.clear();
  let c: any;
  try { c = JSON.parse(ev.content); } catch { return; }
  if (ev.kind === K_PRESENCE) {
    if (ev.pubkey === myId || ev.created_at < now - 120) return;
    const prev = others.get(ev.pubkey);
    if (prev && prev.ts > ev.created_at) return;
    if (c?.gone) others.delete(ev.pubkey);
    else others.set(ev.pubkey, { user: { id: ev.pubkey, name: str(c?.name, 24) || 'anon', color: color(c?.color), track: cleanTrack(c?.track), at: Number(c?.at) || 0 }, seen: Date.now(), ts: ev.created_at });
    recompute();
  } else if (ev.kind === K_REACT) {
    if (ev.pubkey === myId || ev.created_at < now - 20 || !isReaction(c?.g)) return;
    addReaction(c.g, others.get(ev.pubkey)?.user.color || color(c?.c));
  }
}

function recompute() {
  const { me } = useFloor.getState();
  const mine = myTrack();
  const meUser: FloorUser = { id: myId, name: me.name, color: me.color, track: mine.track, at: mine.at, me: true };
  const users = [meUser, ...[...others.values()].map((o) => o.user).sort((a, b) => (b.track ? 1 : 0) - (a.track ? 1 : 0) || a.name.localeCompare(b.name))];
  const spots = new Map<string, FloorSpot>();
  for (const u of users) {
    if (!u.track) continue;
    const s = spots.get(u.track.id);
    if (s) { s.count++; s.users.push(u); }
    else spots.set(u.track.id, { track: u.track, count: 1, at: u.at, users: [u] });
  }
  useFloor.setState({ users, spots: [...spots.values()].sort((a, b) => b.count - a.count) });
}

let presenceTimer = 0;
function schedulePresence(delay = 900) {
  clearTimeout(presenceTimer);
  presenceTimer = window.setTimeout(sendPresence, delay);
}
function sendPresence() {
  const { me } = useFloor.getState();
  const { track, at } = myTrack();
  publish(sign(K_PRESENCE, JSON.stringify({ name: me.name, color: me.color, track, at })));
}

export function startFloor() {
  const since = Math.floor(Date.now() / 1000);
  pool.subscribeMany(RELAYS, { kinds: [K_CHAT], '#t': [ROOM], since: since - 12 * 3600, limit: 120 }, { onevent: onEvent });
  pool.subscribeMany(RELAYS, { kinds: [K_PRESENCE, K_REACT, K_CHAT], '#t': [ROOM], since: since - 120 }, { onevent: onEvent });
  recompute();
  schedulePresence(600);
  setInterval(sendPresence, HEARTBEAT_MS);
  setInterval(() => {
    const cutoff = Date.now() - STALE_MS;
    let changed = false;
    for (const [k, o] of others) if (o.seen < cutoff) { others.delete(k); changed = true; }
    if (changed) recompute();
    const up = [...pool.listConnectionStatus().values()].filter(Boolean).length;
    const s = useFloor.getState();
    const status = up > 0 || Date.now() - lastOk < 60_000 ? 'live' : Date.now() / 1000 - since > 12 ? 'offline' : 'connecting';
    if (s.status !== status || s.relaysUp !== up) useFloor.setState({ status, relaysUp: up });
  }, 2000);

  let lastKey = '';
  usePlayer.subscribe(() => {
    const { track, at } = myTrack();
    const key = `${track?.id ?? ''}|${Math.round(at / 3000)}`;
    if (key === lastKey) return;
    lastKey = key;
    recompute();
    schedulePresence();
  });

  addEventListener('pagehide', () => {
    const { me } = useFloor.getState();
    publish(sign(K_PRESENCE, JSON.stringify({ name: me.name, color: me.color, track: null, gone: true })));
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedulePresence(300); });
}
