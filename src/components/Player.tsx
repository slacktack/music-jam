import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Loader2, Maximize2, Pause, Play, Share2, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { create } from 'zustand';
import { AnimatePresence } from 'motion/react';
import { colorsFor, rng } from '../lib/color';
import { patternFor } from '../lib/flow';
import { REACTIONS } from '../lib/glyphs';
import { isLive, upNext, usePlayer, type Status } from '../lib/player';
import { useFloor } from '../lib/floor';
import { shareTrack } from '../lib/share';
import type { Track } from '../lib/types';
import { Avatar, Cover, DotGlyph, DotWord, Eq, FlowArt } from './Art';
import { LikeButton, fmt } from './Lists';
import { coarse, useCanvas } from './canvas';

// ------------------------------------------------------------ video host
// One YouTube iframe for the whole app. It is never moved in the DOM (that would
// reload it); instead it is laid over whichever <VideoSlot> is visible.

const slots = new Set<HTMLElement>();

export function VideoSlot({ priority, className = '' }: { priority: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.dataset.priority = String(priority);
    slots.add(el);
    return () => void slots.delete(el);
  }, [priority]);
  return <div ref={ref} className={`vslot ${className}`} />;
}

export function VideoHost() {
  const host = useRef<HTMLDivElement>(null);
  const isSong = usePlayer((s) => s.track?.kind === 'song');
  useEffect(() => {
    if (!isSong) {
      host.current!.style.visibility = 'hidden';
      return;
    }
    // Follow the active slot every frame only while things move (scroll, drag,
    // sheet animation); otherwise check a few times a second.
    let raf = 0;
    let fastUntil = performance.now() + 1500;
    const boost = () => { fastUntil = performance.now() + 900; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => {
      raf = 0;
      if (performance.now() < fastUntil) raf = requestAnimationFrame(tick);
      const el = host.current!;
      let best: HTMLElement | null = null;
      let bestP = -1;
      for (const s of slots) {
        const r = s.getBoundingClientRect();
        if (r.width < 8 || r.bottom < 0 || r.top > innerHeight) continue;
        const p = Number(s.dataset.priority);
        if (p > bestP) { best = s; bestP = p; }
      }
      if (!best) { el.style.visibility = 'hidden'; return; }
      const r = best.getBoundingClientRect();
      el.style.visibility = 'visible';
      el.style.width = `${r.width}px`;
      el.style.height = `${r.height}px`;
      el.style.transform = `translate(${r.left}px, ${r.top}px)`;
      el.style.zIndex = String(bestP);
      // In full screen, YouTube's own controls are tappable (its full-screen + picture-in-picture).
      el.style.pointerEvents = bestP >= 95 ? 'auto' : 'none';
      el.style.borderRadius = getComputedStyle(best).borderRadius;
    };
    tick();
    const poll = setInterval(tick, 250);
    const evs = ['scroll', 'pointermove', 'touchmove', 'resize', 'transitionstart', 'wheel'] as const;
    evs.forEach((e) => addEventListener(e, boost, { passive: true, capture: true }));
    const unsub = usePlayer.subscribe(boost);
    const mo = new MutationObserver(boost);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(poll);
      unsub();
      mo.disconnect();
      evs.forEach((e) => removeEventListener(e, boost, { capture: true }));
    };
  }, [isSong]);
  return <div ref={host} id="yt-host" aria-hidden><div id="yt-player" /></div>;
}

// ------------------------------------------------------------ full-screen video

const useTheater = create<{ open: boolean }>(() => ({ open: false }));

async function openTheater() {
  useTheater.setState({ open: true });
  try {
    await document.documentElement.requestFullscreen?.();
    await (screen.orientation as any)?.lock?.('landscape');
  } catch {}
}
function closeTheater() {
  useTheater.setState({ open: false });
  try { (screen.orientation as any)?.unlock?.(); } catch {}
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && useTheater.getState().open) useTheater.setState({ open: false }); });

/** Full-screen video. Rotates to landscape on phones that can't lock orientation. */
export function Theater() {
  const open = useTheater((s) => s.open);
  const track = usePlayer((s) => s.track);
  const status = usePlayer((s) => s.status);
  useEffect(() => { if (open && track?.kind !== 'song') closeTheater(); }, [open, track]);
  return (
    <AnimatePresence>
      {open && track?.kind === 'song' && (
        <motion.div key="theater" className="theater" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="theater-frame"><VideoSlot priority={95} /></div>
          <p className="theater-hint doto">ROTATE FOR FULL SCREEN</p>
          <p className="theater-tip">Leaving the app? Tap the video, then YouTube's full-screen button, then picture-in-picture. The song keeps playing in a small window while you use other apps.</p>
        </motion.div>
      )}
      {open && track?.kind === 'song' && (
        <motion.div key="theater-bar" className="theater-bar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <button className="ctl" onClick={closeTheater} aria-label="Exit full screen"><X size={22} /></button>
          <b>{track.title}</b>
          <button className="ctl" onClick={() => usePlayer.getState().toggle()} aria-label={isLive(status) ? 'Pause' : 'Play'}>{status === 'playing' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
          <button className="ctl" onClick={() => usePlayer.getState().skip(1)} aria-label="Next"><SkipForward size={20} fill="currentColor" /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------ waveform

function Waveform({ track, status, compact }: { track: Track; status: Status; compact?: boolean }) {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const [drag, setDrag] = useState<number | null>(null);
  const [c1, c2] = colorsFor(track.id);
  const heights = useMemo(() => {
    const r = rng(track.id);
    return Array.from({ length: 120 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.35 + r() * 2)) * (0.55 + 0.45 * r()));
  }, [track.id]);
  const song = track.kind === 'song' && !track.live && duration > 0;
  const pct = drag ?? (song ? Math.min(1, position / duration) : 1);
  const state = useRef({ pct, live: status === 'playing', song });
  state.current = { pct, live: status === 'playing', song };

  const ref = useCanvas((ctx, w, h, t) => {
    const { pct, live, song } = state.current;
    ctx.clearRect(0, 0, w, h);
    const gap = compact ? 3 : 4;
    const bw = compact ? 2 : 3;
    const n = Math.floor(w / (bw + gap));
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    for (let i = 0; i < n; i++) {
      const base = heights[i % heights.length];
      const motion = live ? 0.55 + 0.45 * Math.abs(Math.sin(t * (song ? 3 : 4.2) + i * 0.45) * Math.sin(t * 1.7 + i * 0.13)) : 0.35;
      const bh = Math.max(3, h * base * (song ? 0.55 + 0.45 * motion : motion));
      const x = i * (bw + gap);
      const played = x / w <= pct;
      ctx.fillStyle = played ? g : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.roundRect(x, (h - bh) / 2, bw, bh, bw / 2);
      ctx.fill();
    }
  }, true, [track.id, compact], { fps: 24, layer: 'player' });

  const seekAt = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  return (
    <div className={`wave ${compact ? 'compact' : ''}`}>
      <div
        className={`wave-bars ${song ? 'seekable' : ''}`}
        onPointerDown={song ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(seekAt(e)); } : undefined}
        onPointerMove={song ? (e) => drag !== null && setDrag(seekAt(e)) : undefined}
        onPointerUp={song ? (e) => { const p = seekAt(e); setDrag(null); usePlayer.getState().seek(p * duration); } : undefined}
        onPointerCancel={() => setDrag(null)}
        role={song ? 'slider' : undefined}
        aria-label={song ? 'Seek' : undefined}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
      >
        <canvas ref={ref} aria-hidden />
      </div>
      <div className="wave-times doto">
        {song ? <><span>{fmt(drag !== null ? drag * duration : position)}</span><span>{fmt(duration)}</span></> : <><span className="live-tag"><i className="live-dot" /><DotWord value="LIVE" height={14} /></span><DotWord value={track.kind === "radio" ? "RADIO" : "STREAM"} height={14} className="dim" /></>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ pieces

function PlayButton({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const status = usePlayer((s) => s.status);
  const ic = size === 'lg' ? 30 : 20;
  return (
    <motion.button className={`play-btn ${size} ${status === 'playing' ? 'on' : ''}`} whileTap={{ scale: 0.88 }} onClick={(e) => { e.stopPropagation(); usePlayer.getState().toggle(); }} aria-label={isLive(status) ? 'Pause' : 'Play'}>
      {size === 'lg' && <svg className="play-orbit" viewBox="0 0 120 120" aria-hidden>{Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return <circle key={i} cx={60 + Math.cos(a) * 56} cy={60 + Math.sin(a) * 56} r={i % 3 === 0 ? 2.4 : 1.4} style={{ animationDelay: `${i * 40}ms` }} />; })}</svg>}
      {status === 'loading' ? <Loader2 className="spin" size={ic} /> : status === 'playing' ? <Pause size={ic} fill="currentColor" /> : <Play size={ic} fill="currentColor" style={{ marginLeft: size === 'lg' ? 4 : 2 }} />}
    </motion.button>
  );
}

function Crowd({ id }: { id: string }) {
  const spot = useFloor((s) => s.spots.find((x) => x.track.id === id));
  const others = spot ? spot.count - (spot.users.some((u) => u.me) ? 1 : 0) : 0;
  return (
    <div className="crowd">
      {spot && <span className="stack">{spot.users.slice(0, 5).map((u) => <Avatar key={u.id} seed={u.id} color={u.color} size={24} />)}</span>}
      <span>{others > 0 ? <><b className="doto">{others}</b> {others === 1 ? 'other is' : 'others are'} jamming here</> : 'Only you on this one so far. Share it.'}</span>
    </div>
  );
}

function statusLabel(t: Track, s: Status) {
  if (s === 'loading') return 'Tuning in';
  if (s === 'error') return t.kind === 'radio' ? 'Off air' : "Can't play";
  if (s === 'paused' || s === 'idle') return 'Paused';
  return t.kind === 'radio' ? 'On air' : 'Playing';
}

// ------------------------------------------------------------ full player

/** The track `skip(1)` will land on, in the current order. */
function useUpNext() {
  const track = usePlayer((s) => s.track?.id);
  const queue = usePlayer((s) => s.queue);
  const seq = usePlayer((s) => s.seq);
  const order = usePlayer((s) => s.order);
  return useMemo(() => upNext(), [track, queue, seq, order]);
}

const bgPattern = (id: string) => {
  const p = patternFor(id);
  return p === 'grid' ? 'contour' : p === 'rays' ? 'waves' : p;
};

export function NowPlaying({ variant, onClose, onDragStart }: { variant: 'sheet' | 'panel'; onClose?: () => void; onDragStart?: (e: React.PointerEvent) => void }) {
  const track = usePlayer((s) => s.track);
  const status = usePlayer((s) => s.status);
  const context = usePlayer((s) => s.context);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const hasQueue = usePlayer((s) => s.queue.length > 1);
  const order = usePlayer((s) => s.order);
  const next = useUpNext();

  if (!track) {
    return (
      <div className={`np v-${variant} np-empty`}>
        <DotGlyph glyph="note" size={64} mode="pulse" color="var(--accent)" />
        <h3>Nothing playing</h3>
        <p>Pick a song or a station. You'll show up on the floor the moment it starts.</p>
      </div>
    );
  }
  const colors = colorsFor(track.id);
  const p = usePlayer.getState();
  const on = status === 'playing';

  return (
    <div className={`np v-${variant}`} style={{ '--c': colors[0], '--c2': colors[1] } as React.CSSProperties}>
      <div className="np-bg" aria-hidden>
        {track.kind === 'song' && <img src={`https://i.ytimg.com/vi/${track.url}/hqdefault.jpg`} alt="" />}
        <FlowArt seed={track.id} colors={colors} pattern={bgPattern(track.id)} animate={on} energy={on ? 1 : 0.35} bg={null} layer="player" fps={coarse ? 20 : 30} density={0.8} />
        <span />
      </div>
      <div className="np-top" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) onDragStart?.(e); }}>
        {onClose ? <button className="icon-btn glass" onClick={onClose} aria-label="Close player"><ChevronDown size={22} /></button> : <span className="np-spacer" />}
        <div className="np-from">
          <span className={`np-status ${status}`}><i className={`live-dot ${on ? '' : 'off'}`} /><DotWord value={statusLabel(track, status)} height={18} /></span>
          {context && <small>{context}</small>}
        </div>
        <button className="icon-btn glass" onClick={() => shareTrack(track)} aria-label="Share"><Share2 size={19} /></button>
      </div>

      <motion.div key={track.id} className={`np-art ${track.kind} ${on ? 'on' : ''}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        {track.kind === 'song' ? (
          <>
            <img className="np-poster" src={`https://i.ytimg.com/vi/${track.url}/hqdefault.jpg`} alt="" />
            <button className="np-tapzone" onClick={openTheater} aria-label="Watch full screen" />
            <VideoSlot priority={variant === 'sheet' ? 40 : 5} />
            <button className="expand" onClick={openTheater} aria-label="Full screen"><Maximize2 size={18} /></button>
          </>
        ) : (
          <Cover track={track} animate={on} />
        )}
      </motion.div>

      <div className="np-title">
        <div>
          <h3 title={track.title}>{track.title}</h3>
          <p>{track.subtitle}</p>
        </div>
        <LikeButton track={track} size={22} />
      </div>

      <Crowd id={track.id} />
      <Waveform track={track} status={status} />

      <div className="controls">
        <button className="ctl" onClick={() => p.skip(-1)} disabled={!hasQueue} aria-label="Previous"><SkipBack size={24} fill="currentColor" /></button>
        <PlayButton />
        <button className="ctl" onClick={() => p.skip(1)} disabled={!hasQueue} aria-label="Next"><SkipForward size={24} fill="currentColor" /></button>
      </div>

      <div className="np-order">
        <button className={`order-toggle ${order === 'shuffle' ? 'on' : ''}`} onClick={() => usePlayer.getState().setOrder(order === 'shuffle' ? 'linear' : 'shuffle')} aria-pressed={order === 'shuffle'} disabled={!hasQueue} title={hasQueue ? 'Change the play order' : 'Play a list to shuffle it'}>
          <Shuffle size={16} />
          <span className="doto">{order === 'shuffle' ? 'Shuffled' : 'In order'}</span>
        </button>
        {hasQueue && next && (
          <button className="upnext" onClick={() => usePlayer.getState().play(next)}>
            <span className="doto">Up next</span>
            <span className="upnext-text"><b>{next.title}</b><small>{next.subtitle || (next.kind === 'radio' ? 'Live radio' : '')}</small></span>
            <SkipForward size={16} />
          </button>
        )}
      </div>

      <div className="np-foot">
        <div className={`reacts ${variant === 'panel' ? 'hide-desk' : ''}`}>
          {REACTIONS.map((r) => (
            <motion.button key={r.id} whileTap={{ scale: 1.4, rotate: -10 }} onClick={() => useFloor.getState().react(r.id)} aria-label={`React: ${r.label}`} style={{ color: r.color }}>
              <DotGlyph glyph={r.id} size={22} />
            </motion.button>
          ))}
        </div>
        {variant === 'panel' && (
          <div className="volume">
            <button className="icon-btn" onClick={p.toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => p.setVolume(Number(e.target.value))} style={{ '--v': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties} aria-label="Volume" />
          </div>
        )}
        <p className="mode-note">{track.kind === 'radio' ? 'Live radio keeps playing with the screen off.' : 'YouTube song: keep the screen on. For screen-off, pick a radio station.'}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ mini player (mobile)

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const track = usePlayer((s) => s.track);
  const status = usePlayer((s) => s.status);
  const pos = usePlayer((s) => (s.duration > 0 ? s.position / s.duration : 0));
  if (!track) return null;
  const [c1, c2] = colorsFor(track.id);
  return (
    <motion.div className="mini" style={{ '--c': c1, '--c2': c2 } as React.CSSProperties} initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={onOpen} role="button" aria-label="Open player" tabIndex={0}>
      <span className="mini-art">
        {track.kind === 'song' ? <><img src={track.art} alt="" /><VideoSlot priority={20} /></> : <Cover track={track} animate={status === 'playing'} />}
      </span>
      <span className="mini-text">
        <b>{track.title}</b>
        <small><Eq on={status === 'playing'} />{statusLabel(track, status)} · {track.kind === 'radio' ? 'Radio' : track.subtitle}</small>
      </span>
      <PlayButton size="sm" />
      <button className="ctl sm" onClick={(e) => { e.stopPropagation(); usePlayer.getState().skip(1); }} aria-label="Next"><SkipForward size={20} fill="currentColor" /></button>
      {track.kind === 'song' && <span className="mini-progress" style={{ transform: `scaleX(${pos})` }} />}
    </motion.div>
  );
}
