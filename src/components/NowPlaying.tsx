import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Heart, Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { colorsFor } from '../lib/color';
import { isLive, usePlayer } from '../lib/player';
import { useLikes } from '../lib/likes';
import { useFloor } from '../lib/floor';
import { Avatar, EqBars, GlyphArt, Visualizer } from './Art';

const EMOJI = ['🔥', '💚', '🕺', '🙌', '🤯', '💜'];

function Crowd({ stationId }: { stationId: string }) {
  const users = useFloor((s) => s.users);
  const count = useFloor((s) => s.stations.find((x) => x.id === stationId)?.count ?? 0);
  const here = useMemo(() => users.filter((u) => u.stationId === stationId).slice(0, 5), [users, stationId]);
  if (!count) return <div className="crowd muted">Be the first one jamming here</div>;
  return (
    <div className="crowd">
      <span className="stack">
        {here.map((u) => (
          <Avatar key={u.id} seed={u.name} color={u.color} size={26} />
        ))}
      </span>
      <span>
        <b className="doto">{count}</b> jamming here
      </span>
    </div>
  );
}

function Controls({ big }: { big?: boolean }) {
  const status = usePlayer((s) => s.status);
  const hasQueue = usePlayer((s) => s.queue.length > 1);
  const p = usePlayer.getState();
  const sz = big ? 30 : 24;
  return (
    <div className={`controls ${big ? 'big' : ''}`}>
      <button className="ctl" onClick={() => p.skip(-1)} disabled={!hasQueue} aria-label="Previous station">
        <SkipBack size={sz - 6} fill="currentColor" />
      </button>
      <motion.button className="ctl primary" whileTap={{ scale: 0.9 }} onClick={p.toggle} aria-label={isLive(status) ? 'Pause' : 'Play'}>
        {status === 'loading' ? <Loader2 className="spin" size={sz} /> : status === 'playing' ? <Pause size={sz} fill="currentColor" /> : <Play size={sz} fill="currentColor" />}
      </motion.button>
      <button className="ctl" onClick={() => p.skip(1)} disabled={!hasQueue} aria-label="Next station">
        <SkipForward size={sz - 6} fill="currentColor" />
      </button>
    </div>
  );
}

/** Full player: the desktop side card and the body of the mobile sheet. */
export function NowPlaying({ onClose }: { onClose?: () => void }) {
  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const liked = useLikes((s) => !!station && s.likes.some((l) => l.id === station.id));
  const p = usePlayer.getState();

  if (!station) {
    return (
      <div className="np np-empty">
        <div className="np-idle">
          <Visualizer active={false} color="#5B5BFF" />
        </div>
        <h3>Nothing playing</h3>
        <p className="muted">Pick a station and you’ll show up on the floor.</p>
      </div>
    );
  }
  const [c1] = colorsFor(station.id);
  const label = status === 'playing' ? 'On air' : status === 'loading' ? 'Tuning in…' : status === 'error' ? 'Off air' : 'Paused';

  return (
    <div className="np">
      <div className="np-top">
        {onClose ? (
          <button className="icon-btn glass" onClick={onClose} aria-label="Close player">
            <ChevronDown size={20} />
          </button>
        ) : (
          <span />
        )}
        <span className={`np-status ${status}`}>
          <i className={`live-dot ${status === 'playing' ? '' : 'off'}`} />
          {label}
        </span>
        <button className={`icon-btn glass like ${liked ? 'on' : ''}`} onClick={() => useLikes.getState().toggle(station)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <motion.div key={station.id} className={`np-art ${status === 'playing' ? 'playing' : ''}`} initial={{ scale: 0.86, opacity: 0, rotate: -4 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
        <GlyphArt seed={station.id} favicon={station.favicon} />
      </motion.div>

      <div className="np-title">
        <h3 title={station.name}>{station.name}</h3>
        <p className="muted">{[station.tags, station.country].filter(Boolean).join(' · ') || 'Live radio'}</p>
      </div>

      <Crowd stationId={station.id} />

      <div className="np-viz">
        <Visualizer active={status === 'playing'} color={c1} />
      </div>

      <Controls big />

      <div className="volume">
        <button className="icon-btn" onClick={p.toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => p.setVolume(Number(e.target.value))} style={{ '--v': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties} aria-label="Volume" />
        <span className="doto vol-num">{Math.round((muted ? 0 : volume) * 100)}</span>
      </div>

      <div className="reacts">
        {EMOJI.map((e) => (
          <motion.button key={e} whileTap={{ scale: 1.5, rotate: -12 }} onClick={() => useFloor.getState().react(e)} aria-label={`React ${e}`}>
            {e}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Mobile bar above the tabs. */
export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const station = usePlayer((s) => s.station);
  const status = usePlayer((s) => s.status);
  if (!station) return null;
  return (
    <motion.div className="mini" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <button className="mini-open" onClick={onOpen} aria-label="Open player">
        <span className="mini-art">
          <GlyphArt seed={station.id} favicon={station.favicon} />
        </span>
        <span className="mini-text">
          <b>{station.name}</b>
          <small>
            <EqBars active={status === 'playing'} /> {status === 'playing' ? 'On air' : status === 'loading' ? 'Tuning in…' : status === 'error' ? 'Off air' : 'Paused'}
          </small>
        </span>
      </button>
      <button className="ctl primary sm" onClick={usePlayer.getState().toggle} aria-label={isLive(status) ? 'Pause' : 'Play'}>
        {status === 'loading' ? <Loader2 className="spin" size={20} /> : status === 'playing' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>
    </motion.div>
  );
}
