import { create } from 'zustand';
import type { Track } from './types';
import { reportClick } from './radio';
import { toast } from './toast';
import { artworkFor } from './artwork';
import * as yt from './yt';

export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type Order = 'linear' | 'shuffle';

interface PlayerState {
  track: Track | null;
  queue: Track[];
  /** Indices into queue, in play order. Linear is 0..n; shuffle puts the current track first. */
  seq: number[];
  order: Order;
  context: string;
  status: Status;
  volume: number;
  muted: boolean;
  position: number;
  duration: number;
  at: number; // songs: epoch ms of position 0 (shared on the floor for synced joins)
  play: (track: Track, queue?: Track[], context?: string, at?: number) => void;
  toggle: () => void;
  skip: (dir: 1 | -1) => void;
  setOrder: (o: Order) => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

export const isLive = (s: Status) => s === 'playing' || s === 'loading';

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);
const idsOf = (q: Track[]) => q.map((t) => t.id).join('|');
const shuffled = (first: number, n: number) => {
  const rest = identity(n).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first >= 0 && first < n ? [first, ...rest] : rest;
};
/** A usable sequence is an exact permutation of the queue's indices. */
const validSeq = (seq: number[], n: number) => seq.length === n && seq.every((i, k) => i >= 0 && i < n && seq.indexOf(i) === k);

function readOrder(): Order {
  try { return localStorage.getItem('jam.order') === 'shuffle' ? 'shuffle' : 'linear'; } catch { return 'linear'; }
}

const audio = new Audio();
audio.preload = 'none';
audio.setAttribute('playsinline', '');
let hls: { destroy(): void } | null = null;
let token = 0;
let songErrors = 0;
let stallTimer = 0;
let loadedAt = 0; // guards against the ENDED event YouTube fires for the video we just replaced
let autoSkips = 0;

function readVolume() {
  try {
    const v = Number(localStorage.getItem('jam.volume') ?? '0.9');
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.9;
  } catch {
    return 0.9;
  }
}

function stopRadio() {
  hls?.destroy();
  hls = null;
  audio.pause();
  if (audio.getAttribute('src')) {
    audio.removeAttribute('src');
    audio.load();
  }
}

async function loadRadio(t: Track) {
  const my = ++token;
  yt.stop();
  stopRadio();
  const isHls = t.hls || /\.m3u8(\?|$)/i.test(t.url);
  try {
    if (isHls && !audio.canPlayType('application/vnd.apple.mpegurl')) {
      const { default: Hls } = await import('hls.js');
      if (my !== token) return;
      if (!Hls.isSupported()) throw new Error('HLS unsupported');
      const h = new Hls();
      hls = h;
      h.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal && my === token) fail(t); });
      h.loadSource(t.url);
      h.attachMedia(audio);
    } else {
      audio.src = t.url;
    }
    await audio.play();
  } catch (e: any) {
    if (my === token && e?.name !== 'AbortError') fail(t);
  }
}

function loadSong(t: Track, start: number) {
  const my = ++token;
  loadedAt = Date.now();
  stopRadio();
  const { volume, muted } = usePlayer.getState();
  usePlayer.setState({ position: start, duration: t.duration || 0, at: Date.now() - start * 1000 });
  yt.load(t.url, start, volume, muted).catch(() => { if (my === token) fail(t); });
  // iOS can refuse to start an embed without a tap inside it; hand control back.
  clearTimeout(stallTimer);
  stallTimer = window.setTimeout(() => {
    const s = usePlayer.getState();
    if (my === token && s.status === 'loading') {
      usePlayer.setState({ status: 'paused' });
      toast('Tap play to start the song.', 'info');
    }
  }, 9000);
}

function fail(t: Track) {
  if (usePlayer.getState().status === 'error') return;
  usePlayer.setState({ status: 'error' });
  const { queue } = usePlayer.getState();
  // A station that's off air mid-list is common; walk the rest of the list a few times.
  if (t.kind === 'radio' && queue.length > 1 && autoSkips < 3) {
    autoSkips++;
    toast(`${t.title} is off air. Moving to the next station.`, 'info');
    window.setTimeout(() => { if (usePlayer.getState().track?.id === t.id) usePlayer.getState().skip(1); }, 1200);
    return;
  }
  toast(t.kind === 'radio' ? `${t.title} is off air right now. Try another station.` : `Couldn't play ${t.title}.`);
}

export const upNext = (): Track | null => {
  const { track, queue, seq, order } = usePlayer.getState();
  if (queue.length < 2) return null;
  const s = validSeq(seq, queue.length) ? seq : order === 'shuffle' ? shuffled(0, queue.length) : identity(queue.length);
  const qi = track ? queue.findIndex((x) => x.id === track.id) : -1;
  const si = s.indexOf(qi);
  return queue[s[((si < 0 ? 0 : si) + 1 + s.length) % s.length]] ?? null;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  track: null,
  queue: [],
  seq: [],
  order: readOrder(),
  context: '',
  status: 'idle',
  volume: readVolume(),
  muted: false,
  position: 0,
  duration: 0,
  at: 0,
  play(track, queue, context, at) {
    const prev = get();
    const q = queue ?? prev.queue;
    const sameQueue = !queue || queue === prev.queue || idsOf(q) === idsOf(prev.queue);
    const idx = q.findIndex((t) => t.id === track.id);
    let seq: number[];
    if (prev.order === 'linear') seq = identity(q.length);
    else if (sameQueue && validSeq(prev.seq, q.length)) seq = idx < 0 ? prev.seq : [idx, ...prev.seq.filter((i) => i !== idx)];
    else seq = shuffled(idx, q.length);
    if (!sameQueue) autoSkips = 0;
    set({ track, queue: q, seq, status: 'loading', position: 0, ...(context !== undefined ? { context } : {}) });
    setMediaSession(track);
    if (track.kind === 'radio') {
      reportClick(track.id);
      set({ at: 0, duration: 0 });
      loadRadio(track);
    } else {
      const max = (track.duration || 0) - 8;
      const start = at && max > 0 ? Math.min(max, Math.max(0, (Date.now() - at) / 1000)) : 0;
      loadSong(track, start);
    }
  },
  toggle() {
    const { track, status } = get();
    if (!track) return;
    if (track.kind === 'song') {
      if (isLive(status)) {
        yt.pause();
        set({ status: 'paused' });
      } else if (status === 'error' || status === 'idle') {
        get().play(track);
      } else {
        yt.play();
        set({ status: 'loading' });
      }
      return;
    }
    if (isLive(status)) {
      token++;
      stopRadio(); // live radio: stop instead of buffering stale audio
      set({ status: 'paused' });
    } else {
      set({ status: 'loading' });
      loadRadio(track);
    }
  },
  skip(dir) {
    const { track, queue, seq, order } = get();
    if (!queue.length) return;
    const qi = track ? queue.findIndex((t) => t.id === track.id) : -1;
    let s = seq;
    if (!validSeq(s, queue.length)) {
      s = order === 'linear' ? identity(queue.length) : shuffled(qi, queue.length);
      set({ seq: s });
    }
    const si = s.indexOf(qi);
    const t = queue[s[((si < 0 ? 0 : si) + dir + s.length) % s.length]];
    if (t) get().play(t);
  },
  setOrder(order) {
    const { queue, track, seq } = get();
    const qi = track ? queue.findIndex((t) => t.id === track.id) : -1;
    const seq2 =
      order === 'linear'
        ? identity(queue.length)
        : validSeq(seq, queue.length) && qi >= 0
          ? [qi, ...seq.filter((i) => i !== qi)]
          : shuffled(qi, queue.length);
    try { localStorage.setItem('jam.order', order); } catch {}
    set({ order, seq: seq2 });
  },
  seek(sec) {
    const { track } = get();
    if (track?.kind !== 'song') return;
    yt.seek(sec);
    set({ position: sec, at: Date.now() - sec * 1000 });
  },
  setVolume(v) {
    const volume = Math.min(1, Math.max(0, v));
    audio.volume = volume;
    audio.muted = false;
    yt.setVolume(volume);
    yt.setMuted(false);
    try { localStorage.setItem('jam.volume', String(volume)); } catch {}
    set({ volume, muted: false });
  },
  toggleMute() {
    const muted = !get().muted;
    audio.muted = muted;
    yt.setMuted(muted);
    set({ muted });
  },
}));

audio.volume = usePlayer.getState().volume;
audio.addEventListener('playing', () => { if (usePlayer.getState().track?.kind === 'radio') usePlayer.setState({ status: 'playing' }); });
audio.addEventListener('waiting', () => { const s = usePlayer.getState(); if (s.track?.kind === 'radio' && s.status === 'playing') usePlayer.setState({ status: 'loading' }); });
audio.addEventListener('pause', () => { const s = usePlayer.getState(); if (s.track?.kind === 'radio' && s.status === 'playing') usePlayer.setState({ status: 'paused' }); });
audio.addEventListener('error', () => {
  const s = usePlayer.getState();
  if (s.track?.kind === 'radio' && audio.getAttribute('src') && s.status !== 'paused') fail(s.track);
});

yt.on({
  state(code) {
    const s = usePlayer.getState();
    if (s.track?.kind !== 'song') return;
    // Ignore events that belong to a previous video (they can arrive late on slow phones).
    const vid = yt.videoId();
    if (vid && vid !== s.track.url) return;
    if (code === 1) { songErrors = 0; clearTimeout(stallTimer); usePlayer.setState({ status: 'playing', duration: yt.duration() || s.duration }); }
    else if (code === 3) usePlayer.setState({ status: 'loading' });
    else if (code === 2) { if (s.status !== 'loading') usePlayer.setState({ status: 'paused' }); }
    else if (code === 0) {
      // ENDED also arrives for the video we just swapped out — ignore that burst,
      // then always advance. Waiting for a known duration used to stall the queue
      // whenever YouTube's metadata disagreed with the embed.
      if (Date.now() - loadedAt < 4000) return;
      s.skip(1);
    }
  },
  error() {
    const s = usePlayer.getState();
    if (s.track?.kind !== 'song') return;
    const vid = yt.videoId();
    if (vid && vid !== s.track.url) return;
    songErrors++;
    if (songErrors < 4 && s.queue.length > 1) {
      toast(`${s.track.title} can't be played outside YouTube. Skipping.`, 'info');
      s.skip(1);
    } else {
      fail(s.track);
    }
  },
});

// Progress for songs.
setInterval(() => {
  const s = usePlayer.getState();
  if (s.track?.kind !== 'song' || s.status !== 'playing') return;
  const position = yt.time();
  usePlayer.setState({ position, duration: yt.duration() || s.duration });
  if ('mediaSession' in navigator && s.duration > 0) {
    try { navigator.mediaSession.setPositionState({ duration: s.duration, position: Math.min(position, s.duration), playbackRate: 1 }); } catch {}
  }
}, 500);

// YouTube embeds pause when the screen locks; resume the moment the phone is back on.
let wasPlayingSong = false;
let warned = false;
function resumeIfNeeded() {
  const s = usePlayer.getState();
  if (!wasPlayingSong || s.track?.kind !== 'song') return;
  wasPlayingSong = false;
  if (s.status !== 'playing') {
    yt.play();
    // some phones need a second nudge once the page has fully woken up
    setTimeout(() => { if (usePlayer.getState().status !== 'playing') yt.play(); }, 700);
    if (!warned) {
      warned = true;
      toast('YouTube songs pause in the background. Radio keeps going, or use picture-in-picture from full screen.', 'info');
    }
  }
}
document.addEventListener('visibilitychange', () => {
  const s = usePlayer.getState();
  if (document.hidden) wasPlayingSong = s.track?.kind === 'song' && isLive(s.status);
  else resumeIfNeeded();
});
addEventListener('pageshow', resumeIfNeeded);
addEventListener('focus', resumeIfNeeded);

function setMediaSession(t: Track) {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({ title: t.title, artist: t.kind === 'radio' ? `Live radio · ${t.subtitle}` : t.subtitle, album: 'JAM', artwork: artworkFor(t) });
  } catch {}
  const p = () => usePlayer.getState();
  const h = (a: MediaSessionAction, fn: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, fn); } catch {} };
  h('play', () => { if (!isLive(p().status)) p().toggle(); });
  h('pause', () => { if (isLive(p().status)) p().toggle(); });
  h('stop', () => { if (isLive(p().status)) p().toggle(); });
  h('nexttrack', () => p().skip(1));
  h('previoustrack', () => p().skip(-1));
  h('seekto', t.kind === 'song' ? (d) => d.seekTime != null && p().seek(d.seekTime) : null);
}

usePlayer.subscribe((s, prev) => {
  if (s.status !== prev.status && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = s.status === 'playing' ? 'playing' : isLive(s.status) ? 'playing' : s.track ? 'paused' : 'none';
  }
});

export function warmUpYouTube() {
  yt.ensure().catch(() => {});
}
