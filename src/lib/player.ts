import { create } from 'zustand';
import type { Station } from './types';
import { reportClick } from './radio';
import { toast } from './toast';

export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  station: Station | null;
  queue: Station[];
  status: Status;
  volume: number;
  muted: boolean;
  play: (station: Station, queue?: Station[]) => void;
  toggle: () => void;
  skip: (dir: 1 | -1) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

const audio = typeof Audio !== 'undefined' ? new Audio() : (null as unknown as HTMLAudioElement);
let hls: { destroy(): void } | null = null;
let token = 0; // guards against races between quick station switches

const savedVolume = Number(localStorage.getItem('jam.volume') ?? '0.8');

async function load(station: Station) {
  const my = ++token;
  hls?.destroy();
  hls = null;
  audio.pause();
  const isHls = station.hls || /\.m3u8(\?|$)/i.test(station.url);
  try {
    if (isHls && !audio.canPlayType('application/vnd.apple.mpegurl')) {
      const { default: Hls } = await import('hls.js');
      if (my !== token) return;
      if (!Hls.isSupported()) throw new Error('HLS unsupported');
      const h = new Hls({ lowLatencyMode: true });
      hls = h;
      h.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal && my === token) fail(station);
      });
      h.loadSource(station.url);
      h.attachMedia(audio);
    } else {
      audio.src = station.url;
    }
    await audio.play();
  } catch (e: any) {
    // AbortError just means another station was picked mid-load.
    if (my === token && e?.name !== 'AbortError') fail(station);
  }
}

function fail(station: Station) {
  if (usePlayer.getState().status === 'error') return; // play() rejection and the error event both land here
  usePlayer.setState({ status: 'error' });
  toast(`${station.name} is off air right now. Try another one.`);
}

function stop() {
  token++;
  hls?.destroy();
  hls = null;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
}

export const usePlayer = create<PlayerState>((set, get) => ({
  station: null,
  queue: [],
  status: 'idle',
  volume: Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : 0.8,
  muted: false,
  play(station, queue) {
    set({ station, status: 'loading', ...(queue ? { queue } : {}) });
    reportClick(station.id);
    setMediaSession(station);
    load(station);
  },
  toggle() {
    const { station, status } = get();
    if (!station) return;
    if (status === 'playing' || status === 'loading') {
      stop(); // live radio: stop the stream instead of buffering stale audio
      set({ status: 'paused' });
    } else {
      set({ status: 'loading' });
      load(station);
    }
  },
  skip(dir) {
    const { station, queue } = get();
    if (!queue.length) return;
    const i = station ? queue.findIndex((s) => s.id === station.id) : -1;
    get().play(queue[(i + dir + queue.length) % queue.length]);
  },
  setVolume(v) {
    const volume = Math.min(1, Math.max(0, v));
    audio.volume = volume;
    audio.muted = false;
    localStorage.setItem('jam.volume', String(volume));
    set({ volume, muted: false });
  },
  toggleMute() {
    audio.muted = !audio.muted;
    set({ muted: audio.muted });
  },
}));

if (audio) {
  audio.preload = 'none';
  audio.volume = usePlayer.getState().volume;
  audio.addEventListener('playing', () => usePlayer.setState({ status: 'playing' }));
  audio.addEventListener('waiting', () => {
    if (usePlayer.getState().status === 'playing') usePlayer.setState({ status: 'loading' });
  });
  audio.addEventListener('error', () => {
    const { station, status } = usePlayer.getState();
    if (station && audio.getAttribute('src') && status !== 'paused') fail(station);
  });
}

function setMediaSession(station: Station) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: station.name,
    artist: station.tags || station.country || 'Live radio',
    album: 'JAM',
    artwork: station.favicon ? [{ src: station.favicon }] : [],
  });
  const p = usePlayer.getState();
  navigator.mediaSession.setActionHandler('play', () => p.toggle());
  navigator.mediaSession.setActionHandler('pause', () => p.toggle());
  navigator.mediaSession.setActionHandler('nexttrack', () => p.skip(1));
  navigator.mediaSession.setActionHandler('previoustrack', () => p.skip(-1));
}

export const isLive = (s: Status) => s === 'playing' || s === 'loading';
