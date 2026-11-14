import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, MessageCircle, Radio, Users } from 'lucide-react';
import { COLORS, colorsFor } from './lib/color';
import { usePlayer } from './lib/player';
import { useFloor } from './lib/floor';
import { useToasts } from './lib/toast';
import { Avatar } from './components/Art';
import { Discover } from './components/Discover';
import { Chat, FloorView, LikesView } from './components/Floor';
import { MiniPlayer, NowPlaying } from './components/NowPlaying';

type Tab = 'radio' | 'floor' | 'chat' | 'likes';

const mq = typeof matchMedia !== 'undefined' ? matchMedia('(min-width: 1024px)') : null;
const useDesktop = () =>
  useSyncExternalStore(
    (cb) => {
      mq?.addEventListener('change', cb);
      return () => mq?.removeEventListener('change', cb);
    },
    () => !!mq?.matches,
  );

function Logo() {
  return (
    <div className="logo" aria-label="JAM">
      <span className="doto">JAM</span>
      <i />
    </div>
  );
}

function Identity() {
  const me = useFloor((s) => s.me);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(me.name);
  const save = () => {
    const n = name.trim().slice(0, 24);
    if (n) useFloor.getState().setIdentity({ name: n });
    else setName(me.name);
  };
  return (
    <div className="identity">
      <button className="me-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Edit your name and color">
        <Avatar seed={me.name} color={me.color} size={30} />
        <span>{me.name}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="scrim" onClick={() => { save(); setOpen(false); }} />
            <motion.div className="me-pop" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}>
              <label>
                Your name on the floor
                <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && (save(), setOpen(false))} autoFocus />
              </label>
              <div className="swatches" role="radiogroup" aria-label="Your color">
                {COLORS.map((c) => (
                  <button key={c} role="radio" aria-checked={me.color === c} aria-label={c} className={me.color === c ? 'on' : ''} style={{ background: c }} onClick={() => useFloor.getState().setIdentity({ color: c })} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reactions() {
  const reactions = useFloor((s) => s.reactions);
  return (
    <div className="reactions" aria-hidden>
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.span key={r.key} style={{ left: `${r.x}%`, textShadow: `0 0 24px ${r.color}` }} initial={{ y: 0, opacity: 0, scale: 0.4 }} animate={{ y: '-70vh', opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1, 0.9], x: [0, 14, -14, 6] }} exit={{ opacity: 0 }} transition={{ duration: 3, ease: 'easeOut' }}>
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function App() {
  const desktop = useDesktop();
  const [tab, setTab] = useState<Tab>('radio');
  const [sheet, setSheet] = useState(false);
  const station = usePlayer((s) => s.station);
  const playing = usePlayer((s) => s.status === 'playing');
  const unread = useFloor((s) => s.unread);
  const toasts = useToasts((s) => s.items);

  // Chat lives in the side panel on desktop, so that tab only exists on mobile.
  const active: Tab = desktop && tab === 'chat' ? 'radio' : tab;

  // The whole page takes on the color of whatever is playing.
  useEffect(() => {
    const [a, b] = station ? colorsFor(station.id) : ['#5B5BFF', '#2BD94A'];
    const root = document.documentElement.style;
    root.setProperty('--accent', a);
    root.setProperty('--accent2', b);
  }, [station]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== 'Space' || /INPUT|TEXTAREA|BUTTON/.test(t.tagName)) return;
      e.preventDefault();
      usePlayer.getState().toggle();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (desktop) setSheet(false);
  }, [desktop]);

  const tabs: { id: Tab; label: string; icon: typeof Radio; mobileOnly?: boolean }[] = [
    { id: 'radio', label: 'Radio', icon: Radio },
    { id: 'floor', label: 'Floor', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageCircle, mobileOnly: true },
    { id: 'likes', label: 'Likes', icon: Heart },
  ];
  const nav = tabs
    .filter((t) => !(desktop && t.mobileOnly))
    .map((t) => (
      <button key={t.id} className={`nav-btn ${active === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} aria-current={active === t.id ? 'page' : undefined} aria-label={t.label} title={t.label}>
        {active === t.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
        <t.icon size={20} />
        <span className="nav-label">{t.label}</span>
        {t.id === 'chat' && unread > 0 && active !== 'chat' && <i className="dot" />}
      </button>
    ));

  return (
    <div className={`app ${playing ? 'is-playing' : ''}`}>
      <div className="bg" aria-hidden>
        <i className="blob b1" />
        <i className="blob b2" />
        <i className="blob b3" />
        <i className="grain" />
      </div>

      {desktop && (
        <nav className="rail" aria-label="Main">
          <Logo />
          <div className="rail-nav">{nav}</div>
        </nav>
      )}

      <main className="main">
        <div className="topbar">
          {!desktop && <Logo />}
          <span className="grow" />
          <Identity />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} className="view-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {active === 'radio' && <Discover />}
            {active === 'floor' && <FloorView />}
            {active === 'likes' && <LikesView />}
            {active === 'chat' && (
              <div className="view chat-view">
                <Chat />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {desktop ? (
        <aside className="side">
          <div className="panel">
            <NowPlaying />
          </div>
          <div className="panel grow">
            <Chat />
          </div>
        </aside>
      ) : (
        <>
          <div className="dock">
            <MiniPlayer onOpen={() => setSheet(true)} />
            <nav className="tabbar" aria-label="Main">{nav}</nav>
          </div>
          <AnimatePresence>
            {sheet && (
              <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 34 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_e, info) => (info.offset.y > 120 || info.velocity.y > 600) && setSheet(false)}
              >
                <NowPlaying onClose={() => setSheet(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Reactions />
      <div className="toasts" role="status">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
