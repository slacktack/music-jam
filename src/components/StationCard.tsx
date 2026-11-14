import { memo } from 'react';
import { motion } from 'motion/react';
import { Heart, Loader2, Pause, Play } from 'lucide-react';
import type { Station } from '../lib/types';
import { colorsFor } from '../lib/color';
import { usePlayer } from '../lib/player';
import { useLikes } from '../lib/likes';
import { EqBars, GlyphArt } from './Art';

export const StationCard = memo(function StationCard({ station, queue, index, listeners }: { station: Station; queue: Station[]; index: number; listeners?: number }) {
  const status = usePlayer((s) => (s.station?.id === station.id ? s.status : null));
  const liked = useLikes((s) => s.likes.some((l) => l.id === station.id));
  const current = status !== null;
  const onAir = status === 'playing' || status === 'loading';
  const [c1] = colorsFor(station.id);

  const act = () => {
    const p = usePlayer.getState();
    if (current) p.toggle();
    else p.play(station, queue);
  };

  return (
    <motion.div
      className={`card ${current ? 'current' : ''}`}
      style={{ '--c': c1 } as React.CSSProperties}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 14) * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button className="card-art" onClick={act} aria-label={`${onAir ? 'Pause' : 'Play'} ${station.name}`}>
        <GlyphArt seed={station.id} favicon={station.favicon} />
        <span className="card-play">
          {status === 'loading' ? <Loader2 className="spin" size={22} /> : onAir ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </span>
        {!!listeners && (
          <span className="badge">
            <i className="live-dot" />
            {listeners}
          </span>
        )}
        {status === 'playing' && (
          <span className="card-eq">
            <EqBars active />
          </span>
        )}
      </button>
      <div className="card-meta">
        <div className="card-text">
          <div className="card-name" title={station.name}>{station.name}</div>
          <div className="card-sub">{station.tags || station.country || 'Live radio'}</div>
        </div>
        <button className={`icon-btn like ${liked ? 'on' : ''}`} onClick={() => useLikes.getState().toggle(station)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.div>
  );
});
