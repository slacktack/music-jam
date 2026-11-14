// Thin wrapper around the official YouTube IFrame Player API.
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

interface Handlers { state: (s: number) => void; error: (code: number) => void }
let handlers: Handlers = { state() {}, error() {} };
export const on = (h: Handlers) => (handlers = h);

let apiP: Promise<void> | null = null;
let readyP: Promise<any> | null = null;
let player: any = null;
let isReady = false;

function api(): Promise<void> {
  if (apiP) return apiP;
  apiP = new Promise<void>((res, rej) => {
    if (window.YT?.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { apiP = null; rej(new Error('YouTube API failed to load')); };
    document.head.appendChild(s);
  });
  return apiP;
}

/** Create the single player early so later loads can happen inside the user's tap. */
export function ensure(): Promise<any> {
  if (readyP) return readyP;
  readyP = api().then(
    () =>
      new Promise((res, rej) => {
        const el = document.getElementById('yt-player');
        if (!el) return rej(new Error('no #yt-player'));
        player = new window.YT.Player(el, {
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, controls: 1, disablekb: 1, fs: 1, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3, origin: location.origin },
          events: {
            onReady: () => { isReady = true; res(player); },
            onStateChange: (e: any) => handlers.state(e.data),
            onError: (e: any) => handlers.error(e.data),
          },
        });
      }),
  );
  readyP.catch(() => (readyP = null));
  return readyP;
}

export function load(id: string, start: number, volume: number, muted: boolean) {
  const go = (p: any) => {
    p.setVolume(Math.round(volume * 100));
    muted ? p.mute() : p.unMute();
    p.loadVideoById({ videoId: id, startSeconds: Math.max(0, Math.floor(start)) });
  };
  if (isReady) { go(player); return Promise.resolve(); }
  return ensure().then(go);
}

const call = (fn: string, ...args: unknown[]) => { if (isReady) try { return player[fn](...args); } catch {} };
export const play = () => call('playVideo');
export const pause = () => call('pauseVideo');
export const stop = () => call('stopVideo');
export const seek = (s: number) => call('seekTo', s, true);
export const setVolume = (v: number) => call('setVolume', Math.round(v * 100));
export const setMuted = (m: boolean) => call(m ? 'mute' : 'unMute');
export const time = (): number => Number(call('getCurrentTime')) || 0;
export const duration = (): number => Number(call('getDuration')) || 0;
export const videoId = (): string => (call('getVideoData') as any)?.video_id || '';
