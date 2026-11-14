import { memo } from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { Festival, FestState, Vibe } from '../lib/catalog';
import { linkProps } from '../lib/router';
import { FlowArt } from './Art';
import { playCollection } from './collection';

export const VibeTile = memo(function VibeTile({ vibe, size = 'big', index = 0 }: { vibe: Vibe; size?: 'big' | 'small'; index?: number }) {
  return (
    <motion.a
      {...linkProps(`/vibe/${vibe.id}`)}
      className={`vtile ${size}`}
      style={{ '--c': vibe.colors[0], '--c2': vibe.colors[1] } as React.CSSProperties}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      whileTap={{ scale: 0.97 }}
    >
      <FlowArt seed={vibe.id} colors={vibe.colors} pattern={vibe.pattern} animate={size === 'big'} energy={0.7} density={size === 'big' ? 1 : 0.7} />
      <span className="vtile-shade" />
      <span className="vtile-text">
        <b>{vibe.label}</b>
        <small>{vibe.sub}</small>
      </span>
      {size === 'big' && (
        <span
          className="vtile-play"
          role="button"
          aria-label={`Play ${vibe.label}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); playCollection({ songs: vibe.songs, radio: vibe.radio, label: vibe.label }); }}
        >
          <Play size={22} fill="currentColor" />
        </span>
      )}
    </motion.a>
  );
});

export function festLabel(s: FestState) {
  if (s.state === 'now') return 'Happening now';
  if (s.state === 'mood') return 'Mood';
  if (s.days <= 1) return 'Tomorrow';
  if (s.days <= 30) return `In ${s.days} days`;
  return 'Later this year';
}

export const FestCard = memo(function FestCard({ fest, state, index = 0 }: { fest: Festival; state: FestState; index?: number }) {
  return (
    <motion.a
      {...linkProps(`/fest/${fest.id}`)}
      className={`fcard ${state.state}`}
      style={{ '--c': fest.colors[0], '--c2': fest.colors[1] } as React.CSSProperties}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <FlowArt seed={fest.id} colors={fest.colors} pattern={fest.pattern} animate={state.state === 'now'} energy={0.8} density={0.8} />
      <span className="vtile-shade" />
      <span className={`pill ${state.state}`}>{state.state === 'now' && <i className="live-dot" />}{festLabel(state)}</span>
      <span className="vtile-text">
        <b>{fest.label}</b>
        <small>{fest.sub}</small>
      </span>
    </motion.a>
  );
});

export const ArtistCard = memo(function ArtistCard({ artist, index = 0 }: { artist: Vibe; index?: number }) {
  const initials = artist.label.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('');
  return (
    <motion.a {...linkProps(`/artist/${artist.id}`)} className="acard" style={{ '--c': artist.colors[0], '--c2': artist.colors[1] } as React.CSSProperties} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: Math.min(index, 10) * 0.04, ease: [0.2, 0.8, 0.2, 1] }} whileTap={{ scale: 0.94 }}>
      <span className="acard-disc">
        <FlowArt seed={artist.id} colors={artist.colors} pattern={artist.pattern} density={0.7} />
        <span className="acard-initials doto">{initials}</span>
      </span>
      <b>{artist.label}</b>
      <small>{artist.sub}</small>
    </motion.a>
  );
});
