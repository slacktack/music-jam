import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Play, Search as SearchIcon, X, MonitorPlay } from 'lucide-react';
import { colorsFor } from '../lib/color';
import { FEEDS, moreVideos, suggest, videos } from '../lib/tube';
import { usePlayer } from '../lib/player';
import type { Track } from '../lib/types';
import { DotGlyph, DotText } from './Art';
import { fmt, LikeButton } from './Lists';

type Load = { kind: 'load' } | { kind: 'ok'; items: Track[]; token: string } | { kind: 'err' };

function VideoRow({ track, queue, context, meta }: { track: Track; queue: Track[]; context: string; meta?: string }) {
  const status = usePlayer((s) => (s.track?.id === track.id ? s.status : null));
  const current = status !== null;
  const on = status === 'playing';
  const act = () => (current ? usePlayer.getState().toggle() : usePlayer.getState().play(track, queue, context));
  return (
    <div className={`tube-item ${current ? 'current' : ''}`} style={{ '--c': colorsFor(track.id)[0] } as React.CSSProperties}>
      <button className="tube-poster" onClick={act} aria-label={`${on ? 'Pause' : 'Play'} ${track.title}`}>
        <img src={track.art} alt="" loading="lazy" />
        <span className="tube-len doto">{track.live ? <i className="live-pill">LIVE</i> : fmt(track.duration || 0)}</span>
        <span className="tube-fab">{current && on ? <Play size={18} fill="currentColor" /> : <><Play size={16} fill="currentColor" /><b className="doto">WATCH</b></>}</span>
      </button>
      <div className="tube-text">
        <b title={track.title}>{track.title}</b>
        <small>{track.subtitle}</small>
        {meta && <span className="tube-meta doto">{meta}</span>}
      </div>
      <LikeButton track={track} size={16} />
    </div>
  );
}

export function Tube() {
  const [feed, setFeed] = useState(0);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [load, setLoad] = useState<Load>({ kind: 'load' });
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const query = term.trim() || FEEDS[feed].query;
  const context = term.trim() ? `YouTube: ${term.trim()}` : FEEDS[feed].label;

  // Autocomplete, typed just behind the search box.
  useEffect(() => {
    if (q.trim().length < 2) return setHints([]);
    const ctl = new AbortController();
    const id = setTimeout(() => suggest(q, ctl.signal).then(setHints).catch(() => setHints([])), 220);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);

  // Tap or click anywhere outside the box puts the suggestions away.
  useEffect(() => {
    if (!hints.length) return;
    const away = (e: PointerEvent | MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setHints([]);
    };
    addEventListener('pointerdown', away, true);
    return () => removeEventListener('pointerdown', away, true);
  }, [hints.length]);

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'load' });
    setHints([]);
    setHi(-1);
    videos(query, undefined)
      .then((p) => alive && setLoad({ kind: "ok", ...p }))
      .catch(() => alive && setLoad({ kind: 'err' }));
    return () => { alive = false; };
  }, [query, nonce]);

  const append = async () => {
    if (load.kind !== 'ok' || !load.token || busy) return;
    setBusy(true);
    try {
      const next = await moreVideos(load.token);
      setLoad((s) => (s.kind === 'ok' ? { kind: 'ok', items: [...s.items, ...next.items.filter((t) => !s.items.some((x) => x.id === t.id))], token: next.token } : s));
    } finally {
      setBusy(false);
    }
  };

  // Infinite scroll once the tail is in view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || load.kind !== 'ok' || !load.token) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && append(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [load, busy]);

  const choose = (s: string) => {
    setTerm(s);
    setQ(s);
    setHints([]);
    box.current?.querySelector('input')?.blur();
  };

  const items = load.kind === 'ok' ? load.items : [];

  return (
    <div className="page tube">
      <header className="hub-head">
        <DotText text="TUBE" colors={[colorsFor(query)[0], colorsFor(query + 'b')[1]]} className="hub-dots" />
        <div>
          <h1>Everything on YouTube</h1>
          <p>Shelves, search and suggestions for whole videos — not only songs. Tapped videos open in the player and go full screen from there.</p>
        </div>
      </header>

      <div className="tube-search" ref={box}>
        <SearchIcon size={19} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setHi(-1); if (!e.target.value) setTerm(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return setHints([]);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!hints.length) return;
              setHi((i) => (e.key === 'ArrowDown' ? (i + 1) % hints.length : (i - 1 + hints.length) % hints.length));
              return;
            }
            if (e.key !== 'Enter') return;
            e.preventDefault();
            choose(hi >= 0 && hints[hi] ? hints[hi] : q.trim() || FEEDS[feed].query);
          }}
          placeholder="Search any video on YouTube"
          aria-label="Search YouTube"
          autoComplete="off"
        />
        {q && <button className="tube-clear" onClick={() => { setQ(''); setTerm(''); setHints([]); }} aria-label="Clear"><X size={17} /></button>}
        <AnimatePresence>
          {hints.length > 0 && (
            <motion.ul className="tube-hints" role="listbox" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {hints.map((s, i) => (
                <li key={s} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''}>
                  <button onMouseEnter={() => setHi(i)} onClick={() => choose(s)}>
                    <SearchIcon size={15} />
                    <span>{s}</span>
                    <ArrowUp size={14} className="tube-go" />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {!term && (
        <nav className="tube-chips" aria-label="YouTube shelves">
          {FEEDS.map((f, i) => (
            <button key={f.label} className={`tube-chip ${i === feed ? 'on' : ''}`} onClick={() => setFeed(i)} aria-pressed={i === feed}>
              {f.label}
            </button>
          ))}
        </nav>
      )}

      {term && <div className="shead"><h2>Results for “{term}”</h2></div>}

      {load.kind === 'load' ? (
        <div className="tube-rows skel-rows">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="tube-item skel" style={{ animationDelay: `${i * 70}ms` }}><span className="tube-poster" /><span className="tube-text"><b /><small /></span></div>)}
        </div>
      ) : load.kind === 'err' ? (
        <div className="empty">
          <DotGlyph glyph="search" size={56} mode="build" />
          <p>YouTube didn’t answer. This search runs through our own keyless endpoint, so it hiccups sometimes.</p>
          <button className="btn ghost" onClick={() => setNonce((n) => n + 1)}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <DotGlyph glyph="search" size={56} mode="build" />
          <p>Nothing came back for that. Try different words.</p>
        </div>
      ) : (
        <>
          <div className="tube-rows">
            {items.map((t) => <VideoRow key={t.id} track={t} queue={items} context={context} meta={[t.live ? 'LIVE' : '', t.views, t.published].filter(Boolean).join(' · ')} />)}
          </div>
          <div className="tube-more" ref={sentinel}>
            {load.token ? <button className="btn ghost" onClick={append} disabled={busy}>{busy ? 'Loading…' : 'Load more'}</button> : <span className="doto">END OF THE LIST</span>}
          </div>
        </>
      )}
      <p className="fine"><MonitorPlay size={12} /> Videos play in YouTube’s own embed, so the screen has to stay awake. For screen-off listening, use Radio.</p>
    </div>
  );
}
