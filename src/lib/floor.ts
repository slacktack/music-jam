// The floor: one global space plus optional private rooms. Presence, chat and
// reactions travel over public Nostr relays (plain WebSockets on 443), so the site
// needs no backend. Throwaway keys are generated per browser; nothing ties them to
// a real identity. On the global floor everything is public; inside a room every
// event is NIP-44 encrypted and the key only exists in the share link.
import { create } from 'zustand';
import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import type { ChatMsg, FloorSpot, FloorUser, Track } from './types';
import { COLORS } from './color';
import { isLive, usePlayer } from './player';
import { isReaction, type GlyphId } from './glyphs';
import { toast } from './toast';
import { codecFor, currentRoom, namespace, roomForSk, roomFromLink, roomLink, storeRoom, type Room } from './rooms';
import { safeMedia, type Media } from './media';

const DEFAULT_RELAYS = 'wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.mom';
export const RELAYS = (import.meta.env.VITE_RELAYS || DEFAULT_RELAYS).split(',').map((s: string) => s.trim()).filter(Boolean);
const FLOOR = import.meta.env.VITE_FLOOR || 'jam-floor-v2';
const K_PRESENCE = 30778; // parameterized replaceable: one current status per person
const K_CHAT = 4778; // regular, stored: chat history
const K_REACT = 24778; // ephemeral: never stored
const STALE_MS = 75_000;
const HEARTBEAT_MS = 25_000;
/** Room chat is ephemeral by design: nothing older than a quarter of an hour stays. */
const ROOM_TTL_MS = 15 * 60 * 1000;

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

const skHex = store('jam.sk', () => bytesToHex(generateSecretKey()), (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v));
const sk = hexToBytes(skHex);
const myId = getPublicKey(sk);

/** Which space we are in right now: the open floor, or one encrypted room. */
const boot = currentRoom(skHex);
let room: Room | null = boot.room;
let codec = room ? codecFor(room, skHex) : null;
if (room && boot.fromLink) storeRoom(room);
const tag = () => (room ? namespace(room) : FLOOR);

export interface RoomView { code: string; name: string; link: string }
const view = (r: Room): RoomView => ({ code: r.code.toUpperCase(), name: r.name, link: roomLink(r) });

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
  room: RoomView | null;
  /** This device's own room — deterministic, so the link never changes. */
  myRoom: RoomView;
  setIdentity: (patch: Partial<Identity>) => void;
  sendChat: (text: string, media?: Media) => Promise<boolean>;
  react: (g: GlyphId) => void;
  clearUnread: () => void;
  createRoom: () => void;
  joinRoom: (link: string) => boolean;
  leaveRoom: () => void;
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
    title: str(x.title, 90).replace(/\p{Extended_Pictographic}/gu, '').trim() || 'Untitled',
    subtitle: str(x.subtitle, 90).replace(/\p{Extended_Pictographic}/gu, '').trim(),
    url,
    art: /^https:\/\//i.test(art) ? art : '',
    duration: Number.isFinite(x.duration) ? Math.max(0, Math.min(36000, x.duration)) : undefined,
    live: !!x.live,
    hls: !!x.hls,
    video: !!x.video,
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
  room: room ? view(room) : null,
  myRoom: view(roomForSk(skHex)),
  setIdentity(patch) {
    const me = { ...get().me, ...patch };
    try { localStorage.setItem('jam.me', JSON.stringify(me)); } catch {}
    set({ me });
    recompute();
    schedulePresence(200);
  },
  async sendChat(text, media) {
    const t = str(text, 280);
    // Attachments only exist inside a room; the open floor stays text-only.
    const m = get().room && media ? media : undefined;
    if (!t && !m) return false;
    if (Date.now() - lastChat < 1200) { toast('Easy, one message a second.', 'info'); return false; }
    lastChat = Date.now();
    const { me } = get();
    const payload: Record<string, unknown> = { text: t, name: me.name, color: me.color, on: myTrack().track?.title || '' };
    if (m) payload.m = m;
    const ev = sign(K_CHAT, payload);
    addChat(ev, payload, false);
    const ok = await publish(ev);
    if (!ok) toast(get().room ? "Message didn't reach the room. Check your connection." : "Message didn't reach the floor. Check your connection.");
    return ok;
  },
  react(g) {
    if (Date.now() - lastReact < 350) return;
    lastReact = Date.now();
    const ev = sign(K_REACT, { g, c: get().me.color });
    seenIds.add(ev.id);
    addReaction(g, get().me.color);
    publish(ev);
  },
  clearUnread: () => set({ unread: 0 }),
  createRoom: () => setSpace(roomForSk(skHex), 'created'),
  joinRoom: (link) => {
    const r = linkRoom(link);
    if (!r) return false;
    setSpace(r, 'joined');
    return true;
  },
  leaveRoom: () => setSpace(null, 'left'),
}));

let lastChat = 0;
let lastReact = 0;
let reactionKey = 0;
let lastPresenceTs = 0;
let lastOk = 0; // last time any relay answered us

function sign(kind: number, payload: unknown): Event {
  const now = Math.floor(Date.now() / 1000);
  // Replaceable events need strictly increasing timestamps or relays keep the old one.
  const created_at = kind === K_PRESENCE ? Math.max(now, lastPresenceTs + 1) : now;
  if (kind === K_PRESENCE) lastPresenceTs = created_at;
  const where = tag();
  const tags = kind === K_PRESENCE ? [['d', where], ['t', where]] : [['t', where]];
  return finalizeEvent({ kind, created_at, tags, content: codec ? codec.seal(payload) : JSON.stringify(payload) }, sk);
}

const linkRoom = (link: string) => {
  try {
    return roomFromLink(link);
  } catch {
    return null;
  }
};

/**
 * Move between the open floor and a room. Nothing here touches the player, so
 * leaving is seamless: the song keeps playing while the space swaps underneath.
 */
function setSpace(next: Room | null, why: 'created' | 'joined' | 'left') {
  if (next && room && next.code === room.code) {
    useFloor.setState({ room: view(next) });
    return;
  }
  if (room || next) {
    const { me } = useFloor.getState();
    publish(sign(K_PRESENCE, { name: me.name, color: me.color, track: null, gone: true })); // in the space we're leaving
  }
  room = next;
  codec = next ? codecFor(next, skHex) : null;
  storeRoom(next);
  others.clear();
  seenIds.clear();
  useFloor.setState({ room: next ? view(next) : null, messages: [], reactions: [], unread: 0, spots: [] });
  recompute();
  subscribe();
  schedulePresence(400);
  if (why === 'left') toast('Left the room. You are back on the open floor.', 'info');
  if (why === 'joined') toast(`In ${next!.name}. Only people with the link can see this.`, 'info');
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

function addChat(ev: Event, c: any, countUnread: boolean) {
  if (seenIds.has(ev.id) && ev.pubkey !== myId) return;
  seenIds.add(ev.id);
  const text = str(c?.text, 280);
  const media = safeMedia(c?.m);
  if (!text && !media) return;
  const msg: ChatMsg = { id: ev.id, user: { id: ev.pubkey, name: str(c.name, 24) || 'anon', color: color(c.color) }, text, on: str(c.on, 90), ts: ev.created_at * 1000, media: media ?? undefined };
  useFloor.setState((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s;
    const messages = [...s.messages, msg].sort((a, b) => a.ts - b.ts).slice(-150);
    return { messages, unread: countUnread && ev.pubkey !== myId ? s.unread + 1 : s.unread };
  });
}

/** Rooms forget: anything past the quarter-hour goes, locally and on open. */
function expireRoomChat() {
  if (!room) return;
  const cut = Date.now() - ROOM_TTL_MS;
  const { messages } = useFloor.getState();
  const keep = messages.filter((m) => m.ts >= cut);
  if (keep.length !== messages.length) useFloor.setState({ messages: keep });
}

/** Rooms store ciphertext only, so every payload is decoded the same way here. */
function decode(ev: Event): any {
  if (codec) return codec.open(ev.content, ev.pubkey);
  try { return JSON.parse(ev.content); } catch { return null; }
}

function onEvent(ev: Event) {
  lastOk = Date.now();
  const where = tag();
  if (!ev.tags.some((t) => t[0] === 't' && t[1] === where)) return;
  const now = Math.floor(Date.now() / 1000);
  if (ev.kind === K_CHAT) {
    const c = decode(ev);
    if (c) addChat(ev, c, ev.created_at >= bootAt);
    return;
  }
  if (seenIds.has(ev.id)) return;
  seenIds.add(ev.id);
  if (seenIds.size > 5000) seenIds.clear();
  const c = decode(ev);
  if (!c) return;
  if (ev.kind === K_PRESENCE) {
    if (ev.pubkey === myId || ev.created_at < now - 120) return;
    const prev = others.get(ev.pubkey);
    if (prev && prev.ts > ev.created_at) return;
    const fresh = { name: str(c?.name, 24) || 'anon', color: color(c?.color), track: cleanTrack(c?.track) };
    const inRoom = !!room;
    if (!c?.gone && Date.now() / 1000 - bootAt > 6) {
      if (!prev) sysLine(ev.pubkey, fresh.name, fresh.color, fresh.track ? `joined, playing ${fresh.track.title}` : inRoom ? 'joined the room' : 'joined the floor');
      else if (fresh.track && fresh.track.id !== prev.user.track?.id) sysLine(ev.pubkey, fresh.name, fresh.color, `tuned into ${fresh.track.title}`);
    }
    if (c?.gone) others.delete(ev.pubkey);
    else others.set(ev.pubkey, { user: { id: ev.pubkey, name: str(c?.name, 24) || 'anon', color: color(c?.color), track: cleanTrack(c?.track), at: Number(c?.at) || 0 }, seen: Date.now(), ts: ev.created_at });
    recompute();
  } else if (ev.kind === K_REACT) {
    if (ev.pubkey === myId || ev.created_at < now - 20 || !isReaction(c?.g)) return;
    addReaction(c.g, others.get(ev.pubkey)?.user.color || color(c?.c));
  }
}

let sysN = 0;
function sysLine(id: string, name: string, c: string, text: string) {
  const msg: ChatMsg = { id: `sys-${++sysN}`, user: { id, name, color: c }, text, on: '', ts: Date.now(), sys: true };
  useFloor.setState((s) => ({ messages: [...s.messages, msg].slice(-150) }));
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
  publish(sign(K_PRESENCE, { name: me.name, color: me.color, track, at }));
}

let subs: { close(): void }[] = [];

/** (Re)open the two subscriptions for whatever space is current. */
function subscribe() {
  const where = tag();
  const since = Math.floor(Date.now() / 1000);
  // On the floor we backfill half a day of chat; a room only ever loads its window.
  const back = room ? Math.max(120, ROOM_TTL_MS / 1000) : 12 * 3600;
  subs.forEach((s) => { try { s.close(); } catch {} });
  subs = [
    pool.subscribeMany(RELAYS, { kinds: [K_CHAT], '#t': [where], since: since - back, limit: room ? 60 : 120 }, { onevent: onEvent }),
    pool.subscribeMany(RELAYS, { kinds: [K_PRESENCE, K_REACT, K_CHAT], '#t': [where], since: since - 120 }, { onevent: onEvent }),
  ];
  expireRoomChat();
}

export function startFloor() {
  const since = Math.floor(Date.now() / 1000);
  subscribe();
  recompute();
  schedulePresence(600);
  setInterval(sendPresence, HEARTBEAT_MS);
  setInterval(() => {
    expireRoomChat();
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
    publish(sign(K_PRESENCE, { name: me.name, color: me.color, track: null, gone: true }));
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedulePresence(300); });
}
