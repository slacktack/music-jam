import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { SKINS, useSkin } from '../lib/skins';
import { linkProps } from '../lib/router';
import { DotText } from './Art';

function SkinTile({ id, compact }: { id: string; compact?: boolean }) {
  const active = useSkin((s) => s.skin);
  const set = useSkin((s) => s.set);
  const skin = SKINS.find((s) => s.id === id)!;
  const on = active === skin.id;
  // Preview each skin with its own colours so the tiles read as samples, not labels.
  const vars = Object.fromEntries(Object.entries(skin.vars).filter(([k]) => ['--bg', '--s1', '--s2', '--text', '--mute', '--display', '--label', '--track', '--r4'].includes(k))) as Record<string, string>;
  const a = skin.swatch;
  return (
    <motion.button
      type="button"
      className={`skin-tile ${on ? 'on' : ''}`}
      style={{ ...(vars as React.CSSProperties), '--accent': a[0], '--accent2': a[1] } as React.CSSProperties}
      onClick={() => set(skin.id)}
      whileTap={{ scale: 0.98 }}
      aria-pressed={on}
    >
      <span className="skin-row">
        <span className="skin-sw">{skin.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>
        <span className="skin-name" style={{ color: 'var(--text, inherit)' }}>{skin.label}</span>
        {on && <Check size={15} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
      </span>
      {!compact && <span className="skin-story" style={{ color: 'var(--mute, inherit)' }}>{skin.story}</span>}
    </motion.button>
  );
}

export function SkinGrid({ compact }: { compact?: boolean }) {
  return (
    <div className="skin-list">
      {SKINS.map((s) => <SkinTile key={s.id} id={s.id} compact={compact} />)}
    </div>
  );
}

/** Full-screen gallery — the showcase version of the popover. */
export function ThemesPage() {
  const skin = useSkin((s) => s.skin);
  const current = SKINS.find((s) => s.id === skin)!;
  return (
    <div className="page themes">
      <header className="hub-head">
        <DotText text="SKINS" colors={[current.swatch[0], current.swatch[1]]} className="hub-dots" />
        <div>
          <h1>{SKINS.length - 1} looks, one player</h1>
          <p>Ported from the folio themes. A skin moves colour, type, corners, texture and the whole mood — JAM stays the default and keeps following the music.</p>
        </div>
      </header>
      <SkinGrid />
      <p className="fine">Now showing {current.label}. Press T to cycle, or open the palette in the top bar. Nothing you play, like or chat changes when you switch.</p>
      <a className="btn ghost" {...linkProps('/')}>Back to the floor</a>
    </div>
  );
}
