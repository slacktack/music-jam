import { useEffect, useRef } from 'react';
import { coarse } from './canvas';

/**
 * The cursor that every folio theme draws: a dot pinned to the pointer and a ring
 * that lags behind it, stretching with speed. Skins restyle it entirely in CSS
 * (see styles/skins.css), so this only produces geometry, state and CSS variables.
 * Desktop pointers only — touch and reduced-motion machines keep their own cursor.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || coarse || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    root.classList.add('has-cursor');

    let x = -100, y = -100, rx = -100, ry = -100, raf = 0, state = '', text = '';
    let magnet: HTMLElement | null = null;
    const PULL = '.btn, .cap-btn, .tube-chip, .nav-btn, .share-tile, .skin-tile';

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as Element | null;

      // Buttons lean toward the pointer instead of sitting still under it.
      const b = t?.closest?.<HTMLElement>(PULL);
      if (magnet && magnet !== b) { magnet.style.removeProperty('--mx'); magnet.style.removeProperty('--my'); }
      magnet = b ?? null;
      if (b) {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${((x - r.left) / r.width - 0.5) * 10}px`);
        b.style.setProperty('--my', `${((y - r.top) / r.height - 0.5) * 8}px`);
      }

      const hit = t?.closest?.('a, button, [role=button], input, textarea, select, summary, .skin-tile');
      const next = !hit ? '' : /^(INPUT|TEXTAREA)$/.test((hit as HTMLElement).tagName) ? 'text' : 'link';
      const nextText = (hit as HTMLElement | null)?.dataset?.cursor ?? '';
      if (next !== state || nextText !== text) {
        state = next;
        text = nextText;
        if (state) ring.current?.setAttribute('data-state', state);
        else ring.current?.removeAttribute('data-state');
        if (label.current) label.current.textContent = text;
      }
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = 0;
      const dx = (x - rx) * 0.2;
      const dy = (y - ry) * 0.2;
      rx += dx;
      ry += dy;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const el = ring.current;
      if (el) {
        el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        el.style.setProperty('--cv', String(Math.min(1, Math.hypot(dx, dy) / 40)));
        if (Math.abs(dx) + Math.abs(dy) > 0.5) el.style.setProperty('--ca', `${Math.atan2(dy, dx)}rad`);
      }
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.2 || Math.abs(dx) + Math.abs(dy) > 0.2) raf = requestAnimationFrame(tick);
    };

    const down = () => ring.current?.setAttribute('data-down', '');
    const up = () => ring.current?.removeAttribute('data-down');
    const out = () => { x = -100; y = -100; if (!raf) raf = requestAnimationFrame(tick); };

    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    document.addEventListener('pointerleave', out);
    return () => {
      root.classList.remove('has-cursor');
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move);
      removeEventListener('pointerdown', down);
      removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', out);
    };
  }, []);

  return (
    <>
      <div className="cur-ring" ref={ring} aria-hidden><span ref={label} /></div>
      <div className="cur-dot" ref={dot} aria-hidden />
    </>
  );
}
