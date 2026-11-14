import { memo } from 'react';
import { motion } from 'motion/react';
import { Heart, Loader2, Pause, Play } from 'lucide-react';
import type { Track } from '../lib/types';
import { colorsFor } from '../lib/color';
import { isLive, usePlayer } from '../lib/player';
import { useLikes, useLiked } from '../lib/likes';
import { useFloor } from '../lib/floor';
import { Cover, Eq } from './Art';

export const fmt = (s: number) => {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

function useTrackStatus(id: string) {
  return usePlayer((s) => (s.track?.id === id ? s.status : null));
}

export function LikeButton({ track, size = 18 }: { track: Track; size?: number }) {
  const liked = useLiked(track.id);
  return (
    <motion.button whileTap={{ scale: 1.35 }} className={`icon-btn like ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); useLikes.getState().toggle(track); }} aria-label={liked ? 'Remove from likes' : 'Like'} aria-pressed={liked}>
      <Heart size={size} fill={liked ? 'currentColor' : 'none'} />
    </motion.button>
  );
}

export const TrackRow = memo(function TrackRow({ track, queue, context, index }: { track: Track; queue: Track[]; context: string; index?: number }) {
  const status = useTrackStatus(track.id);
  const current = status !== null;
  const act = () => (current ? usePlayer.getState().toggle() : usePlayer.getState().play(track, queue, context));
  return (
    <motion.div
      className={`trow ${current ? 'current' : ''}`}
      style={{ '--c': colorsFor(track.id)[0] } as React.CSSProperties}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index ?? 0, 12) * 0.025 }}
      onClick={act}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act())}
      aria-label={`${current && isLive(status!) ? 'Pause' : 'Play'} ${track.title}`}
    >
      {index !== undefined && <span className="trow-n doto">{String(index + 1).padStart(2, '0')}</span>}
      <span className="trow-art">
        <Cover track={track} />
        <span className="trow-state">{status === 'loading' ? <Loader2 className="spin" size={18} /> : status === 'playing' ? <Eq on /> : current ? <Play size={16} fill="currentColor" /> : null}</span>
      </span>
      <span className="trow-text">
        <b>{track.title}</b>
        <small>{track.subtitle}</small>
      </span>
      <span className="trow-meta doto">{track.kind === 'radio' || track.live ? <i className="live-pill">LIVE</i> : fmt(track.duration || 0)}</span>
      <LikeButton track={track} />
    </motion.div>
  );
});

export const StationTile = memo(function StationTile({ track, queue, context, index = 0, listeners }: { track: Track; queue: Track[]; context: string; index?: number; listeners?: number }) {
  const status = useTrackStatus(track.id);
  const current = status !== null;
  const on = status === 'playing';
  const act = () => (current ? usePlayer.getState().toggle() : usePlayer.getState().play(track, queue, context));
  return (
    <motion.div className={`tile ${current ? 'current' : ''}`} style={{ '--c': colorsFor(track.id)[0] } as React.CSSProperties} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: [0.2, 0.8, 0.2, 1] }}>
      <button className="tile-art" onClick={act} aria-label={`${on ? 'Pause' : 'Play'} ${track.title}`}>
        <Cover track={track} animate={on} />
        <span className="tile-fab">{status === 'loading' ? <Loader2 className="spin" size={20} /> : isLive(status ?? 'idle') ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</span>
        {!!listeners && <span className="tile-badge doto"><i className="live-dot" />{listeners}</span>}
      </button>
      <div className="tile-meta">
        <div className="tile-text">
          <b title={track.title}>{track.title}</b>
          <small>{track.subtitle}</small>
        </div>
        <LikeButton track={track} size={16} />
      </div>
    </motion.div>
  );
});

export function useListeners() {
  const spots = useFloor((s) => s.spots);
  return (id: string) => spots.find((s) => s.track.id === id)?.count;
}

export function RowSkeleton({ n = 8 }: { n?: number }) {
  return <div className="rows">{Array.from({ length: n }, (_, i) => <div key={i} className="trow skel" style={{ animationDelay: `${i * 70}ms` }}><span className="trow-art" /><span className="trow-text"><b /><small /></span></div>)}</div>;
}

export function TileSkeleton({ n = 6 }: { n?: number }) {
  return <div className="tiles">{Array.from({ length: n }, (_, i) => <div key={i} className="tile skel" style={{ animationDelay: `${i * 70}ms` }}><div className="tile-art" /><div className="sk-line" /><div className="sk-line short" /></div>)}</div>;
}
