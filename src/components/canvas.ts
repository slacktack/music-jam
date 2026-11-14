import { useEffect, useRef } from 'react';

export const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = navigator as Navigator & { deviceMemory?: number };
export const coarse = matchMedia('(pointer: coarse)').matches;
/** Older/low-power devices: fewer, cheaper animations. */
export const LITE = reducedMotion || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
if (LITE) document.documentElement.classList.add('lite');
if (coarse) document.documentElement.classList.add('touch');

/** While the full-screen player is open, canvases behind it stop drawing. */
let sheetOpen = false;
const wake = new Set<() => void>();
export function setSheetOpen(v: boolean) {
  sheetOpen = v;
  wake.forEach((f) => f());
}

interface Opts { fps?: number; layer?: 'page' | 'player'; maxDpr?: number }

/**
 * Canvas with DPR scaling, resize handling and a frame loop that only runs while
 * `animate` is true, the canvas is on screen, the tab is visible and it isn't
 * covered by the player sheet. Capped FPS keeps phones cool.
 */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void, animate: boolean, deps: unknown[], opts: Opts = {}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const animRef = useRef(animate);
  animRef.current = animate;
  const kick = useRef<() => void>(() => {});
  const fps = Math.min(opts.fps ?? 30, LITE ? 20 : 60);
  const layer = opts.layer ?? 'page';

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let w = 0, h = 0, raf = 0, visible = true, last = 0;
    const t0 = performance.now() - Math.random() * 4000;
    const covered = () => layer === 'page' && sheetOpen;
    const running = () => animRef.current && visible && !document.hidden && !reducedMotion && !covered();
    const frame = (now: number) => {
      raf = 0;
      if (!w || !h) return;
      if (now - last >= 1000 / fps - 2 || !running()) {
        last = now;
        drawRef.current(ctx, w, h, (now - t0) / 1000);
      }
      if (running()) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    kick.current = start;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(opts.maxDpr ?? (animRef.current ? 1.5 : 2), LITE ? 1 : 2, devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      if (!w || !h) return;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      start();
    });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(c);
    document.addEventListener('visibilitychange', start);
    wake.add(start);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wake.delete(start);
      document.removeEventListener('visibilitychange', start);
    };
  }, []);

  useEffect(() => kick.current(), [animate, ...deps]);
  return ref;
}
