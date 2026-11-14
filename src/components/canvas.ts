import { useEffect, useRef } from 'react';

export const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Canvas with DPR scaling, resize handling and a rAF loop that only runs while
 * `animate` is true, the canvas is on screen and the tab is visible.
 */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void, animate: boolean, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const animRef = useRef(animate);
  animRef.current = animate;
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let w = 0, h = 0, raf = 0, visible = true;
    const t0 = performance.now() - Math.random() * 4000;
    const frame = (now: number) => {
      raf = 0;
      if (!w || !h) return;
      drawRef.current(ctx, w, h, (now - t0) / 1000);
      if (animRef.current && visible && !document.hidden && !reducedMotion) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    kick.current = start;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(2, devicePixelRatio || 1);
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
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', start);
    };
  }, []);

  useEffect(() => kick.current(), [animate, ...deps]);
  return ref;
}
