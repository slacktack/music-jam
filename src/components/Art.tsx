import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Pattern } from '../lib/catalog';
import { colorsFor, rng } from '../lib/color';
import { drawFlow, patternFor } from '../lib/flow';
import { GLYPHS, type GlyphId } from '../lib/glyphs';
import type { Track } from '../lib/types';
import { useCanvas } from './canvas';

export const FlowArt = memo(function FlowArt({ seed, colors, pattern, animate = false, energy = 1, density, className = '', bg }: { seed: string; colors: [string, string]; pattern: Pattern; animate?: boolean; energy?: number; density?: number; className?: string; bg?: string | null }) {
  const base = useMemo(() => rng(seed)() * 20, [seed]);
  const ref = useCanvas((ctx, w, h, t) => drawFlow(ctx, w, h, { seed, colors, pattern, t: base + t, energy, density, bg }), animate, [seed, colors[0], colors[1], pattern, energy, density, bg]);
  return <canvas ref={ref} className={`flow ${className}`} aria-hidden />;
});

/** Dot-matrix glyph as SVG. `mode` animates the dots in. */
export const DotGlyph = memo(function DotGlyph({ glyph, size = 28, color = 'currentColor', mode }: { glyph: GlyphId; size?: number; color?: string; mode?: 'build' | 'pulse' }) {
  const bits = GLYPHS[glyph];
  return (
    <svg className={`glyph ${mode ? `g-${mode}` : ''}`} width={size} height={size} viewBox="0 0 70 70" style={{ color }} aria-hidden>
      {bits.flatMap((row, y) => row.map((on, x) => (on ? <circle key={`${x}-${y}`} cx={5 + x * 10} cy={5 + y * 10} r="4.2" fill="currentColor" style={{ animationDelay: `${(x + y) * 45}ms` }} /> : null)))}
    </svg>
  );
});

export const Avatar = memo(function Avatar({ seed, color, size = 28 }: { seed: string; color: string; size?: number }) {
  const cells = useMemo(() => {
    const r = rng(seed);
    const out: [number, number][] = [];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 3; x++)
        if (r() > 0.45) {
          out.push([x, y]);
          if (x < 2) out.push([4 - x, y]);
        }
    return out.length ? out : ([[2, 2]] as [number, number][]);
  }, [seed]);
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 40 40" style={{ color }} aria-hidden>
      <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.18" />
      {cells.map(([x, y], i) => <circle key={i} cx={10 + x * 5} cy={10 + y * 5} r="2.1" fill="currentColor" />)}
    </svg>
  );
});

/** Square cover for any track: song thumbnail, or generated art for radio. */
export const Cover = memo(function Cover({ track, animate = false }: { track: Track; animate?: boolean }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(false), [track.art]);
  if (track.kind === 'song') {
    return (
      <span className="cover">
        <FlowArt seed={track.id} colors={colorsFor(track.id)} pattern={patternFor(track.id)} />
        {track.art && <img src={track.art} alt="" loading="lazy" referrerPolicy="no-referrer" className={ok ? 'ok' : ''} onLoad={() => setOk(true)} />}
      </span>
    );
  }
  return (
    <span className="cover">
      <FlowArt seed={track.id} colors={colorsFor(track.id)} pattern={patternFor(track.id)} animate={animate} energy={0.8} />
      <span className="cover-plate">
        {track.art && <img src={track.art} alt="" loading="lazy" referrerPolicy="no-referrer" className={ok ? 'ok' : ''} onLoad={(e) => e.currentTarget.naturalWidth >= 48 && setOk(true)} onError={() => setOk(false)} />}
        {!ok && <DotGlyph glyph="radio" size={26} color="#fff" />}
      </span>
    </span>
  );
});

export function Eq({ on }: { on: boolean }) {
  return <span className={`eq ${on ? 'on' : ''}`} aria-hidden><i /><i /><i /><i /></span>;
}

/** Big dot-matrix headline that reacts to the cursor/finger and breathes on its own. */
export function DotText({ text, colors, energy = 0, className = '' }: { text: string; colors: [string, string]; energy?: number; className?: string }) {
  const [fonts, setFonts] = useState(false);
  const st = useRef({ key: '', dots: [] as { x: number; y: number; on: boolean; c: string }[], step: 8, px: -1e4, py: -1e4, pk: 0, last: 0 });
  useEffect(() => {
    let alive = true;
    document.fonts?.load('800 100px "Geist Variable"').finally(() => alive && setFonts(true));
    return () => { alive = false; };
  }, []);

  const ref = useCanvas((ctx, w, h, t) => {
    const s = st.current;
    const key = `${w}x${h}|${text}|${colors}|${fonts}`;
    if (key !== s.key) {
      s.key = key;
      s.step = Math.max(4, Math.round(h / 15));
      const off = document.createElement('canvas');
      off.width = Math.ceil(w);
      off.height = Math.ceil(h);
      const o = off.getContext('2d', { willReadFrequently: true })!;
      let fs = h * 1.02;
      o.font = `800 ${fs}px "Geist Variable", system-ui, sans-serif`;
      const mw = o.measureText(text).width;
      if (mw > w * 0.98) fs *= (w * 0.98) / mw;
      o.font = `800 ${fs}px "Geist Variable", system-ui, sans-serif`;
      o.textAlign = 'left';
      o.textBaseline = 'middle';
      o.fillStyle = '#fff';
      o.fillText(text, 0, h * 0.54);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const dots: typeof s.dots = [];
      const c1 = hexRgb(colors[0]);
      const c2 = hexRgb(colors[1]);
      for (let y = s.step / 2; y < h; y += s.step)
        for (let x = s.step / 2; x < w; x += s.step) {
          const on = data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 110;
          const u = x / w;
          dots.push({ x, y, on, c: `rgb(${mix(c1[0], c2[0], u)},${mix(c1[1], c2[1], u)},${mix(c1[2], c2[2], u)})` });
        }
      s.dots = dots;
    }
    ctx.clearRect(0, 0, w, h);
    // No pointer for a while: a ghost cursor wanders so it's alive on phones too.
    const idle = performance.now() - s.last > 2200;
    const px = idle ? w * (0.5 + 0.42 * Math.sin(t * 0.55)) : s.px;
    const py = idle ? h * (0.5 + 0.35 * Math.sin(t * 1.3)) : s.py;
    s.pk += ((idle ? 0.55 : 1) - s.pk) * 0.08;
    const R = s.step * 7;
    const step = s.step;
    for (const d of s.dots) {
      const dist = Math.hypot(d.x - px, d.y - py);
      const k = Math.max(0, 1 - dist / R) * s.pk;
      const wave = 0.5 + 0.5 * Math.sin(d.x * 0.02 + d.y * 0.012 - t * 2.4);
      let r: number;
      if (d.on) {
        r = step * (0.3 + 0.07 * wave + 0.16 * k + 0.05 * energy * Math.sin(t * 9 + d.x * 0.08));
        ctx.globalAlpha = 0.72 + 0.28 * Math.max(wave, k);
        ctx.fillStyle = k > 0.55 ? '#fff' : d.c;
      } else {
        r = step * (0.09 + 0.2 * k);
        ctx.globalAlpha = 0.07 + 0.45 * k;
        ctx.fillStyle = d.c;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, true, [text, colors[0], colors[1], energy, fonts]);

  useEffect(() => {
    const c = ref.current!;
    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      st.current.px = e.clientX - r.left;
      st.current.py = e.clientY - r.top;
      st.current.last = performance.now();
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', move);
    return () => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerdown', move); };
  }, []);

  return <canvas ref={ref} className={`dottext ${className}`} role="img" aria-label={text} />;
}

const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: number, b: number, u: number) => Math.round(a + (b - a) * u);
