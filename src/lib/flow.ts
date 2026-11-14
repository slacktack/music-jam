// Generative line art. Pure drawing, shared by <FlowArt>, the full-screen
// player backdrop and the lock-screen artwork.
import type { Pattern } from './catalog';
import { rng } from './color';

export interface FlowOpts {
  seed: string;
  colors: [string, string];
  pattern: Pattern;
  t: number; // seconds
  energy?: number; // 0..1.5, how much it moves
  bg?: string | null;
  density?: number; // line count multiplier
}

const TAU = Math.PI * 2;

export function drawFlow(ctx: CanvasRenderingContext2D, w: number, h: number, o: FlowOpts) {
  const r = rng(o.seed + o.pattern);
  const e = o.energy ?? 1;
  const t = o.t;
  const d = o.density ?? 1;
  ctx.clearRect(0, 0, w, h);
  if (o.bg !== null) {
    ctx.fillStyle = o.bg ?? '#060608';
    ctx.fillRect(0, 0, w, h);
  }
  const ang = r() * TAU;
  const g = ctx.createLinearGradient(w / 2 - Math.cos(ang) * w, h / 2 - Math.sin(ang) * h, w / 2 + Math.cos(ang) * w, h / 2 + Math.sin(ang) * h);
  g.addColorStop(0.15, o.colors[0]);
  g.addColorStop(0.85, o.colors[1]);
  ctx.strokeStyle = g;
  ctx.fillStyle = g;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ph = r() * 100;

  switch (o.pattern) {
    case 'waves': {
      const n = Math.round(12 * d);
      const gap = w / n;
      ctx.lineWidth = gap * 0.34;
      const f1 = 1.2 + r() * 1.6;
      const f2 = 3 + r() * 3;
      for (let i = -1; i <= n; i++) {
        const x0 = (i + 0.5) * gap;
        ctx.beginPath();
        for (let y = -10; y <= h + 10; y += 5) {
          const u = y / h;
          const x = x0 + Math.sin(u * f1 * Math.PI + t * 0.9 + i * 0.32 + ph) * gap * 0.55 * e + Math.sin(u * f2 * Math.PI - t * 1.4 + i * 0.9) * gap * 0.18 * e;
          y === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'zigzag': {
      const n = Math.round(15 * d);
      const gap = h / n;
      ctx.lineWidth = gap * 0.3;
      const cx = w * (0.3 + r() * 0.4);
      const steps = 12;
      for (let i = -1; i <= n; i++) {
        const y0 = (i + 0.5) * gap;
        ctx.beginPath();
        for (let k = 0; k <= steps; k++) {
          const x = (k / steps) * (w + 40) - 20;
          const fall = Math.exp(-(((x - cx) / (w * 0.32)) ** 2));
          const amp = gap * 1.25 * e * fall * (0.55 + 0.45 * Math.sin(t * 1.6 + i * 0.45 + k * 0.6 + ph));
          const y = y0 + (k % 2 ? amp : -amp * 0.4);
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'rings': {
      const cx = w * (0.4 + r() * 0.2);
      const cy = h * (0.4 + r() * 0.2);
      const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      const step = Math.min(w, h) / (9 * d);
      ctx.lineWidth = step * 0.36;
      const lobes = 3 + Math.floor(r() * 4);
      for (let i = 1, rad = step; rad < maxR + step; i++, rad += step) {
        ctx.beginPath();
        for (let a = 0; a <= TAU + 0.01; a += TAU / 72) {
          const wob = Math.sin(a * lobes + t * 1.1 - i * 0.5 + ph) * step * 0.42 * e * Math.min(1, i / 3);
          const rr = rad + wob;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }
    case 'rays': {
      const cx = w / 2;
      const cy = h * 0.52;
      const R = Math.min(w, h) * (0.16 + 0.02 * Math.sin(t * 2) * e);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();
      const m = 40;
      ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.012);
      for (let j = 0; j < m; j++) {
        const a = (j / m) * TAU + t * 0.08;
        const len = Math.min(w, h) * (0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.2 * e + j * 1.7 + ph)));
        const r0 = R * 1.35;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
        ctx.stroke();
      }
      // water lines under the sun
      const lines = 6;
      ctx.lineWidth = Math.max(2, h * 0.018);
      for (let i = 0; i < lines; i++) {
        const y0 = h * 0.8 + i * h * 0.035;
        ctx.globalAlpha = 1 - i / (lines + 1);
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 6) {
          const y = y0 + Math.sin(x * 0.03 + t * 2 + i) * h * 0.008 * (1 + e);
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'contour': {
      const n = Math.round(16 * d);
      const gap = h / n;
      ctx.lineWidth = gap * 0.32;
      const f1 = 1 + r() * 2;
      const bx = w * r();
      for (let i = -1; i <= n; i++) {
        const y0 = (i + 0.5) * gap;
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 6) {
          const bump = Math.exp(-(((x - bx) / (w * 0.25)) ** 2)) * gap * 2.2 * e * Math.sin(t * 0.8 + i * 0.25);
          const y = y0 + Math.sin((x / w) * f1 * TAU + t * 0.7 + i * 0.2 + ph) * gap * 0.45 * e + bump;
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'grid': {
      const step = Math.min(w, h) / (11 * d);
      const cx = w * (0.3 + r() * 0.4);
      const cy = h * (0.3 + r() * 0.4);
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          const dist = Math.hypot(x - cx, y - cy) / step;
          const s = 0.5 + 0.5 * Math.sin(dist * 0.9 - t * 2.4 * e + ph);
          const rad = step * (0.1 + 0.34 * s);
          ctx.globalAlpha = 0.25 + 0.75 * s;
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

const PATTERNS: Pattern[] = ['waves', 'zigzag', 'rings', 'contour', 'grid', 'rays'];
export const patternFor = (seed: string): Pattern => PATTERNS[Math.floor(rng(seed + 'p')() * PATTERNS.length)];
