// Crisp 512px lock-screen artwork for radio stations (favicons are tiny and blurry).
import type { Track } from './types';
import { colorsFor } from './color';
import { drawFlow, patternFor } from './flow';
import { GLYPHS } from './glyphs';

const cache = new Map<string, string>();

export function artworkFor(track: Track): MediaImage[] {
  if (track.kind === 'song') {
    return [
      { src: `https://i.ytimg.com/vi/${track.url}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.url}/sddefault.jpg`, sizes: '640x480', type: 'image/jpeg' },
      { src: `https://i.ytimg.com/vi/${track.url}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
    ];
  }
  let src = cache.get(track.id);
  if (!src) {
    try {
      const S = 512;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const ctx = c.getContext('2d')!;
      drawFlow(ctx, S, S, { seed: track.id, colors: colorsFor(track.id), pattern: patternFor(track.id), t: 0.6, energy: 0.9 });
      // dark plate + dot "radio" glyph in the middle
      ctx.fillStyle = 'rgba(6,6,8,0.78)';
      ctx.beginPath();
      ctx.roundRect(S / 2 - 92, S / 2 - 92, 184, 184, 48);
      ctx.fill();
      ctx.fillStyle = '#fff';
      GLYPHS.radio.forEach((row, y) => row.forEach((on, x) => {
        if (!on) return;
        ctx.beginPath();
        ctx.arc(S / 2 - 60 + x * 20, S / 2 - 60 + y * 20, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }));
      src = c.toDataURL('image/png');
      cache.set(track.id, src);
    } catch {
      src = '';
    }
  }
  return [
    ...(src ? [{ src, sizes: '512x512', type: 'image/png' }] : []),
    { src: `${location.origin}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
  ];
}
