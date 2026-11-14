import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Pattern } from '../lib/catalog';
import { colorsFor, rng } from '../lib/color';
import { drawFlow, patternFor } from '../lib/flow';
import { FONT, GLYPHS, type GlyphId } from '../lib/glyphs';
import type { Track } from '../lib/types';
import { LITE, coarse, useCanvas } from './canvas';

export const FlowArt = memo(function FlowArt({ seed, colors, pattern, animate = false, energy = 1, density, className = '', bg, layer = 'page', fps = 24 }: { seed: string; colors: [string, string]; pattern: Pattern; animate?: boolean; energy?: number; density?: number; className?: string; bg?: string | null; layer?: 'page' | 'player'; fps?: number }) {
  const base = useMemo(() => rng(seed)() * 20, [seed]);
  const ref = useCanvas((ctx, w, h, t) => drawFlow(ctx, w, h, { seed, colors, pattern, t: base + t, energy, density, bg }), animate && !(LITE && layer === 'page'), [seed, colors[0], colors[1], pattern, energy, density, bg], { fps, layer });
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

/**
 * Big dot-matrix headline from a hand-made 5x7 font: crisp at any size. Reacts to
 * cursor/finger (glow + ripples), breathes on its own, and cross-fades between colour sets.
 */
export function DotText({ text, colors, energy = 0, className = '' }: { text: string; colors: string[]; energy?: number; className?: string }) {
  const st = useRef({
    key: '', step: 8, ox: 0, oy: 0,
    dots: [] as { x: number; y: number; on: boolean; col: number; rgb: number[]; to: number[] }[],
    px: -1e4, py: -1e4, pk: 0, last: 0, ripples: [] as { x: number; y: number; t0: number }[],
  });
  const target = useRef(colors.map(hexRgb));
  target.current = colors.map(hexRgb);

  const ref = useCanvas((ctx, w, h, t) => {
    const s = st.current;
    // Each font pixel becomes a 2x2 block of dots: twice the resolution, same letterforms.
    const S = 2;
    const chars = [...text.toUpperCase()].map((c) => FONT[c] || FONT[' ']);
    const CW = 5 * S, GAP = 2, ROWS = 7 * S;
    const cols = chars.length * (CW + GAP) - GAP;
    const key = `${w}x${h}|${text}`;
    if (key !== s.key) {
      s.key = key;
      const pad = 1.6;
      s.step = Math.min(w / (cols + pad * 2), h / (ROWS + pad * 2));
      const gridW = Math.floor(w / s.step), gridH = Math.floor(h / s.step);
      s.ox = (w - gridW * s.step) / 2 + s.step / 2;
      s.oy = (h - gridH * s.step) / 2 + s.step / 2;
      const c0 = Math.round((gridW - cols) / 2), r0 = Math.round((gridH - ROWS) / 2);
      const old = s.dots;
      s.dots = [];
      for (let gy = 0; gy < gridH; gy++)
        for (let gx = 0; gx < gridW; gx++) {
          const lx = gx - c0, ly = gy - r0;
          let on = false;
          const cx = lx % (CW + GAP);
          if (ly >= 0 && ly < ROWS && lx >= 0 && lx < cols && cx < CW) on = chars[Math.floor(lx / (CW + GAP))][Math.floor(ly / S)][Math.floor(cx / S)] === 'X';
          const prev = old[s.dots.length];
          s.dots.push({ x: s.ox + gx * s.step, y: s.oy + gy * s.step, on, col: Math.max(0, Math.min(1, lx / Math.max(1, cols - 1))), rgb: prev?.rgb ?? [255, 255, 255], to: [0, 0, 0] });
        }
    }
    ctx.clearRect(0, 0, w, h);
    const idle = performance.now() - s.last > 2200;
    const px = idle ? w * (0.5 + 0.42 * Math.sin(t * 0.55)) : s.px;
    const py = idle ? h * (0.5 + 0.35 * Math.sin(t * 1.3)) : s.py;
    s.pk += ((idle ? 0.5 : 1) - s.pk) * 0.08;
    const step = s.step;
    const R = step * 10;
    const now = performance.now();
    s.ripples = s.ripples.filter((r) => now - r.t0 < 1400);
    const tg = target.current;
    for (const d of s.dots) {
      // colour: gradient across the word through every colour in the set, eased toward it
      const f = d.col * (tg.length - 1);
      const i = Math.min(tg.length - 2, Math.floor(f));
      const u = f - i;
      const a = tg[Math.max(0, i)], b = tg[Math.min(tg.length - 1, i + 1)];
      for (let k = 0; k < 3; k++) d.rgb[k] += ((a[k] + (b[k] - a[k]) * u) - d.rgb[k]) * 0.05;
      let k = Math.max(0, 1 - Math.hypot(d.x - px, d.y - py) / R) * s.pk;
      for (const rp of s.ripples) {
        const age = (now - rp.t0) / 1400;
        const ring = Math.abs(Math.hypot(d.x - rp.x, d.y - rp.y) - age * w * 0.9);
        k = Math.max(k, Math.max(0, 1 - ring / (step * 1.8)) * (1 - age));
      }
      const wave = 0.5 + 0.5 * Math.sin(d.x * 0.02 + d.y * 0.012 - t * 2.4);
      const beat = energy ? 0.5 + 0.5 * Math.sin(t * 7 - d.col * 9) : 0;
      let r: number;
      if (d.on) {
        r = step * (0.36 + 0.03 * wave + 0.08 * k + 0.04 * beat * energy);
        ctx.globalAlpha = 0.82 + 0.18 * Math.max(wave, k);
        ctx.fillStyle = k > 0.6 ? '#fff' : `rgb(${d.rgb[0] | 0},${d.rgb[1] | 0},${d.rgb[2] | 0})`;
      } else {
        r = step * (0.1 + 0.2 * k);
        ctx.globalAlpha = 0.07 + 0.45 * k;
        ctx.fillStyle = `rgb(${d.rgb[0] | 0},${d.rgb[1] | 0},${d.rgb[2] | 0})`;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, true, [text, energy], { fps: coarse ? 30 : 45, crisp: true });

  useEffect(() => {
    const c = ref.current!;
    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      st.current.px = e.clientX - r.left;
      st.current.py = e.clientY - r.top;
      st.current.last = performance.now();
    };
    const down = (e: PointerEvent) => {
      move(e);
      st.current.ripples.push({ x: st.current.px, y: st.current.py, t0: performance.now() });
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerdown', down);
    const id = setInterval(() => {
      if (performance.now() - st.current.last < 3000 || document.hidden) return;
      st.current.ripples.push({ x: c.clientWidth * (0.2 + Math.random() * 0.6), y: c.clientHeight * (0.3 + Math.random() * 0.4), t0: performance.now() });
    }, 4200);
    return () => { clearInterval(id); c.removeEventListener('pointermove', move); c.removeEventListener('pointerdown', down); };
  }, []);

  return <canvas ref={ref} className={`dottext ${className}`} role="img" aria-label={text} />;
}

const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Dot-matrix equalizer used for loading states. */
export function DotLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="dotloader" role="status" aria-label={label}>
      <div className="dl-grid">{Array.from({ length: 9 }, (_, c) => <span key={c} className="dl-col" style={{ animationDelay: `${c * 90}ms` }}>{Array.from({ length: 7 }, (_, r) => <i key={r} />)}</span>)}</div>
      <span className="doto">{label}</span>
    </div>
  );
}

/** Crisp vector dot-matrix text (any size, any screen). */
export function DotNumber({ value, height = 26, className = '' }: { value: string; height?: number; className?: string }) {
  const chars = [...value.toUpperCase()].map((c) => FONT[c] || FONT[' ']);
  const w = chars.length * 6 - 1;
  return (
    <svg className={`dotnum ${className}`} height={height} viewBox={`0 0 ${w} 7`} aria-label={value} role="img">
      {chars.flatMap((rows, i) => rows.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? <circle key={`${i}-${x}-${y}`} cx={i * 6 + x + 0.5} cy={y + 0.5} r={0.44} /> : null))))}
    </svg>
  );
}

export const DotWord = DotNumber;
