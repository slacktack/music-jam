import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { colorsFor, rng } from '../lib/color';

/** Generated cover art: a gradient tile with a symmetric dot-glyph, unique per seed. */
export const GlyphArt = memo(function GlyphArt({ seed, favicon }: { seed: string; favicon?: string }) {
  const gid = useId();
  const [imgOk, setImgOk] = useState(false);
  useEffect(() => setImgOk(false), [favicon]);
  const { c1, c2, dots, angle } = useMemo(() => {
    const [c1, c2] = colorsFor(seed);
    const r = rng(seed);
    const dots: { x: number; y: number; r: number; o: number }[] = [];
    const N = 7;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < Math.ceil(N / 2); x++) {
        if (r() < 0.42) continue;
        const rad = 2 + r() * 2.6;
        const o = 0.55 + r() * 0.45;
        const px = (i: number) => 17 + i * 11;
        dots.push({ x: px(x), y: px(y), r: rad, o });
        if (x !== N - 1 - x) dots.push({ x: px(N - 1 - x), y: px(y), r: rad, o });
      }
    }
    return { c1, c2, dots, angle: Math.floor(r() * 360) };
  }, [seed]);

  return (
    <span className="art">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={gid} gradientTransform={`rotate(${angle} .5 .5)`}>
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
          <radialGradient id={`${gid}s`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gid})`} />
        <rect width="100" height="100" fill={`url(#${gid}s)`} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity={d.o} />
        ))}
      </svg>
      {favicon && (
        <img
          src={favicon}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={imgOk ? 'ok' : ''}
          onLoad={(e) => e.currentTarget.naturalWidth >= 96 && setImgOk(true)}
          onError={() => setImgOk(false)}
        />
      )}
    </span>
  );
});

/** Identicon avatar for a person on the floor. */
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
      <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.22" />
      {cells.map(([x, y], i) => (
        <circle key={i} cx={10 + x * 5} cy={10 + y * 5} r="2" fill="currentColor" />
      ))}
    </svg>
  );
});

export function EqBars({ active }: { active: boolean }) {
  return (
    <span className={`eq ${active ? 'on' : ''}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

/** Dot-matrix spectrum. Streams are cross-origin without CORS, so the motion is synthesized. */
export function Visualizer({ active, color }: { active: boolean; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(active);
  live.current = active;
  const col = useRef(color);
  col.current = color;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0, h = 0, cols = 0, rows = 0;
    const STEP = 9, DOT = 2.6;
    let levels: number[] = [];
    const phases = Array.from({ length: 96 }, () => Math.random() * 100);

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor(w / STEP));
      rows = Math.max(1, Math.floor(h / STEP));
      levels = Array.from({ length: cols }, (_, i) => levels[i] || 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 40) return;
      last = t;
      const s = t / 1000;
      ctx.clearRect(0, 0, w, h);
      const ox = (w - (cols - 1) * STEP) / 2;
      for (let c = 0; c < cols; c++) {
        const p = phases[c % phases.length];
        const shape = 0.55 + 0.45 * Math.sin((c / cols) * Math.PI); // taller in the middle
        const target = live.current
          ? shape * (0.3 + 0.7 * Math.abs(Math.sin(s * 2.1 + p) * Math.sin(s * 3.7 + p * 1.7) + 0.35 * Math.sin(s * 9 + p * 3)))
          : 0.06;
        levels[c] += (Math.min(1, target) - levels[c]) * (live.current ? 0.45 : 0.12);
        const lit = Math.max(1, Math.round(levels[c] * rows));
        for (let r = 0; r < rows; r++) {
          const on = r < lit;
          ctx.globalAlpha = on ? (r === lit - 1 ? 1 : 0.35 + 0.5 * (r / rows)) : 0.09;
          ctx.fillStyle = on ? col.current : '#fff';
          ctx.beginPath();
          ctx.arc(ox + c * STEP, h - STEP / 2 - r * STEP, DOT, 0, 6.3);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (reduce) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="viz" aria-hidden />;
}
