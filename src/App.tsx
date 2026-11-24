import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { ChevronsDown, ChevronsUp, Heart, Moon, Palette, Search as SearchIcon, Sun } from 'lucide-react';
import { ACCENTS, useTheme } from './lib/theme';
import { flipMode, isDark, skinById, useSkin } from './lib/skins';
import { useKit } from './lib/skinKit';
import { useRef } from 'react';
import { COLORS } from './lib/color';
import { trackColors } from './lib/catalog';
import { usePlayer, warmUpYouTube } from './lib/player';
import { useFloor } from './lib/floor';
import { useToasts, toast } from './lib/toast';
import { go, linkProps, useRoute, type Route } from './lib/router';
import { stationById } from './lib/radio';
import { thumb } from './lib/songs';
import { Avatar, DotGlyph } from './components/Art';
import { Collection, Home, RadioHub, Search } from './components/Pages';
import { Chat, FloorView, Likes } from './components/Social';
import { MiniPlayer, NowPlaying, Theater, VideoHost } from './components/Player';
import { RoomChip, useRoomLink } from './components/Rooms';
import { SkinGrid, ThemesPage } from './components/Skins';
import { ShareSheet } from './components/Share';
import { MediaViewer } from './components/ChatMedia';
import { Cursor } from './components/Cursor';
import { Tube } from './components/Tube';
import { setSheetOpen } from './components/canvas';

const mq = matchMedia('(min-width: 1024px)');
const useDesktop = () => useSyncExternalStore((cb) => (mq.addEventListener('change', cb), () => mq.removeEventListener('change', cb)), () => mq.matches);

const LOGO = ['..XXX..XXX..X...X', '....X.X...X.XX.XX', '....X.X...X.X.X.X', '....X.XXXXX.X.X.X', 'X...X.X...X.X...X', 'X...X.X...X.X...X', '.XXX..X...X.X...X'];

function Logo() {
  return (
    <a className="logo" {...linkProps('/')} aria-label="JAM home">
      <svg viewBox="0 0 51 21" width="58" height="24" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent2)" />
          </linearGradient>
        </defs>
        {LOGO.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? <circle key={`${x}-${y}`} cx={1.5 + x * 3} cy={1.5 + y * 3} r="1.25" fill="currentColor" /> : null)))}
      </svg>
      <i />
    </a>
  );
}

function TopSearch() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <label className="top-search">
      <SearchIcon size={18} />
      <input ref={ref} placeholder="Search songs, singers, stations, festivals" aria-label="Search" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) go(`/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`); }} onChange={(e) => { const v = e.target.value; if (v.trim().length > 1) go(`/search?q=${encodeURIComponent(v)}`, { replace: location.pathname === '/search' }); }} />
      <kbd className="doto">⌘K</kbd>
    </label>
  );
}

function ThemeControls() {
  const accent = useTheme((s) => s.accent);
  const skinId = useSkin((s) => s.skin);
  const skin = skinById(skinId);
  const jam = skinId === 'jam';
  const dark = isDark();
  const kit = useKit();
  const [open, setOpen] = useState(false);
  return (
    <div className="theme-ctl">
      <button className="cap-btn round" onClick={() => setOpen((o) => !o)} aria-label="Skins and accent colour" aria-expanded={open}>
        {skinId === 'jam' ? <Palette size={18} /> : <span className="skin-dots"><i style={{ background: skin.swatch[0] }} /><i style={{ background: skin.swatch[1] }} /></span>}
      </button>
      {/* Every skin ships a light and a dark palette, so this always does something. */}
      <button className="cap-btn mode-btn" onClick={flipMode} aria-pressed={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
        <span className="mode-label doto">{dark ? kit.words.light : kit.words.dark}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="scrim" onClick={() => setOpen(false)} />
            <motion.div className="me-pop accent-pop wide" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}>
              <span className="pop-title">Skins</span>
              <SkinGrid compact />
              <button className="pop-link" onClick={() => { setOpen(false); go('/themes'); }}>All themes</button>
              <span className="pop-title">Accent</span>
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  className={`accent-row ${accent === a.id ? 'on' : ''} ${a.id === 'music' && !jam ? 'dim' : ''}`}
                  title={a.id === 'music' && !jam ? 'Skins keep their own palette. Pick a colour to override.' : a.label}
                  onClick={() => { useTheme.getState().setAccent(a.id); setOpen(false); }}
                >
                  <i style={{ background: a.id === 'music' && !jam ? 'var(--s3)' : `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />{a.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(id); }, []);
  return (
    <div className="clock doto" aria-hidden>
      <b>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</b>
      <small>{now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</small>
    </div>
  );
}

function Identity() {
  useTheme((s) => s.theme + s.accent);
  const me = useFloor((s) => s.me);
  const myId = useFloor((s) => s.myId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(me.name);
  const save = () => {
    const n = name.trim().slice(0, 24);
    if (n && n !== me.name) useFloor.getState().setIdentity({ name: n });
    else setName(me.name);
  };
  return (
    <div className="identity">
      <button className="me-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Your name and colour">
        <Avatar seed={myId} color={me.color} size={30} />
        <span>{me.name}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="scrim" onClick={() => { save(); setOpen(false); }} />
            <motion.div className="me-pop" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}>
              <label>Your name on the floor<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && (save(), setOpen(false))} /></label>
              <div className="pop-row">
                <button className="pop-link" onClick={flipMode}>{isDark() ? <Sun size={16} /> : <Moon size={16} />} {isDark() ? 'Light' : 'Dark'} mode</button>
                <button className="pop-link" onClick={() => { setOpen(false); go('/themes'); }}><Palette size={16} /> Skins</button>
              </div>
              <div className="accent-dots" role="radiogroup" aria-label="Accent">
                {ACCENTS.map((a) => <button key={a.id} role="radio" aria-checked={useTheme.getState().accent === a.id} title={a.label} className={useTheme.getState().accent === a.id ? 'on' : ''} style={{ background: a.id === 'music' ? 'conic-gradient(#FF8A00, #FF2D95, #5B5BFF, #2BD94A, #FF8A00)' : `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} onClick={() => useTheme.getState().setAccent(a.id)} />)}
              </div>
              <a className="pop-link" {...linkProps('/likes')} onClick={(e) => { e.preventDefault(); setOpen(false); go('/likes'); }}><Heart size={16} /> Your likes</a>
              <div className="swatches" role="radiogroup" aria-label="Your colour">
                {COLORS.map((c) => <button key={c} role="radio" aria-checked={me.color === c} aria-label={c} className={me.color === c ? 'on' : ''} style={{ background: c }} onClick={() => useFloor.getState().setIdentity({ color: c })} />)}
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
          <motion.span key={r.key} style={{ left: `${r.x}%`, color: r.color, filter: `drop-shadow(0 0 12px ${r.color})` }} initial={{ y: 0, opacity: 0, scale: 0.3 }} animate={{ y: '-62vh', opacity: [0, 1, 1, 0], scale: [0.3, 1.6, 1.1, 0.8], rotate: [0, -12, 10, 0] }} exit={{ opacity: 0 }} transition={{ duration: 3.2, ease: [0.2, 0.7, 0.3, 1] }}>
            <DotGlyph glyph={r.glyph} size={46} mode="build" />
            <span className="burst">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': `${i * 36}deg` } as React.CSSProperties} />)}</span>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toasts() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toasts" role="status">
      <AnimatePresence>
        {items.map((t) => <motion.div key={t.id} className={`toast ${t.tone}`} initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>{t.text}</motion.div>)}
      </AnimatePresence>
    </div>
  );
}

/** Opening a shared /r/<id> or /s/<id> link: load it into the player, ready to play. */
function useSharedTrack(route: Route, openPlayer: () => void) {
  useEffect(() => {
    if (route.name !== 'radio' && route.name !== 'song') return;
    let alive = true;
    (async () => {
      try {
        const t = route.name === 'radio'
          ? await stationById(route.id)
          : { id: `yt:${route.id}`, kind: 'song' as const, title: route.title || 'Shared song', subtitle: route.by || 'YouTube', url: route.id, art: thumb(route.id, 'mq') };
        if (!alive) return;
        if (!t) throw new Error('missing');
        usePlayer.setState({ track: t, queue: [t], status: 'idle', context: 'Shared with you' });
        openPlayer();
      } catch {
        toast("That shared station isn't available anymore.");
      }
      go('/', { replace: true });
    })();
    return () => { alive = false; };
  }, [route]);
}

export function App() {
  const desktop = useDesktop();
  const kit = useKit();
  // Desktop side column: the player is big until you go to the chat, then it folds to a row.
  const [chatMode, setChatMode] = useState(false);
  const route = useRoute();
  const [sheet, setSheet] = useState(false);
  const dragControls = useDragControls();
  const track = usePlayer((s) => s.track);
  const playing = usePlayer((s) => s.status === 'playing');
  const unread = useFloor((s) => s.unread);
  useSharedTrack(route, () => !desktop && setSheet(true));
  useRoomLink(route);

  const accentMode = useTheme((s) => s.accent);
  const skinId = useSkin((s) => s.skin);
  useEffect(() => {
    // Fixed accent from the picker wins, then the skin's own palette, then the music.
    const fixed = ACCENTS.find((x) => x.id === accentMode && x.id !== 'music');
    const skin = skinById(skinId);
    const [a, b] = fixed ? fixed.colors : skin.accent ? ['var(--k1)', 'var(--k2)'] : (track ? trackColors(track, usePlayer.getState().context) : ['#FF8A00', '#FF2D95']);
    const root = document.documentElement.style;
    root.setProperty('--accent', a);
    root.setProperty('--accent2', b);
    document.title = track && playing ? `${track.title} · JAM` : 'JAM · every radio, one floor';
  }, [track, playing, accentMode, skinId]);

  useEffect(() => {
    const id = setTimeout(warmUpYouTube, 1200);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA/.test(t.tagName)) return;
      if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const linear = usePlayer.getState().order !== 'shuffle';
        usePlayer.getState().setOrder(linear ? 'shuffle' : 'linear');
        toast(linear ? 'Shuffling this list' : 'Back to playing in order', 'info');
        return;
      }
      if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        useSkin.getState().cycle();
        toast(`Skin: ${skinById(useSkin.getState().skin).label}`, 'info');
        return;
      }
      if (e.code !== 'Space' || /BUTTON|A/.test(t.tagName)) return;
      e.preventDefault();
      usePlayer.getState().toggle();
    };
    addEventListener('keydown', onKey);
    return () => { clearTimeout(id); removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { if (desktop) setSheet(false); }, [desktop]);
  useEffect(() => setSheetOpen(sheet), [sheet]);
  useEffect(() => { if (route.name === 'chat' && desktop) go('/floor', { replace: true }); }, [route, desktop]);

  // Back button closes the player sheet on phones.
  useEffect(() => {
    if (!sheet) return;
    history.pushState({ sheet: true }, '');
    const onPop = () => setSheet(false);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [sheet]);
  const closeSheet = () => (history.state?.sheet ? history.back() : setSheet(false));

  const { icons: ic, words: w } = kit;
  const tabs = [
    { path: '/', name: 'home', label: w.home, icon: ic.home },
    { path: '/radio', name: 'stations', label: w.stations, icon: ic.stations },
    { path: '/tube', name: 'tube', label: w.tube, icon: ic.tube },
    ...(desktop ? [{ path: '/search', name: 'search', label: w.search, icon: ic.search }] : []),
    { path: '/floor', name: 'floor', label: w.floor, icon: ic.floor },
    ...(desktop ? [{ path: '/likes', name: 'likes', label: w.likes, icon: ic.likes }] : [{ path: '/chat', name: 'chat', label: w.chat, icon: ic.chat }]),
  ];
  const activeTab = route.name === 'vibe' || route.name === 'fest' || route.name === 'artist' ? 'home' : route.name === 'room' ? 'floor' : route.name;
  const nav = tabs.map((t) => (
    <a key={t.name} className={`nav-btn ${activeTab === t.name ? 'on' : ''}`} {...linkProps(t.path)} aria-current={activeTab === t.name ? 'page' : undefined} aria-label={t.label}>
      {activeTab === t.name && <motion.span layoutId={desktop ? 'rail-pill' : 'tab-pill'} className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <t.icon size={desktop ? 21 : 19} strokeWidth={activeTab === t.name ? 2.4 : 1.9} />
      <span className="nav-label">{t.label}</span>
      {t.name === 'chat' && unread > 0 && activeTab !== 'chat' && <i className="dot" />}
    </a>
  ));

  let page: React.ReactNode;
  switch (route.name) {
    case 'search': page = <Search q={route.q} />; break;
    case 'vibe': page = <Collection kind="vibe" id={route.id} />; break;
    case 'fest': page = <Collection kind="fest" id={route.id} />; break;
    case 'artist': page = <Collection kind="artist" id={route.id} />; break;
    case 'floor': page = <FloorView />; break;
    case 'tube': page = <Tube />; break;
    case 'themes': page = <ThemesPage />; break;
    case 'chat': page = <div className="page chat-page"><Chat /></div>; break;
    case 'likes': page = <Likes />; break;
    case 'stations': page = <RadioHub tab={route.tab} />; break;
    default: page = <Home />;
  }
  const pageKey = route.name === 'vibe' || route.name === 'fest' || route.name === 'artist' ? `${route.name}/${route.id}` : route.name === 'search' ? 'search' : route.name;

  return (
    <div className={`app ${playing ? 'is-playing' : ''} ${track ? 'has-track' : ''} ${track?.kind === 'song' ? 'has-video' : ''} ${desktop ? 'desk' : 'mob'}`}>
      <div className="bg" aria-hidden><i className="glow g1" /><i className="glow g2" /><i className="dots" /></div>

      {desktop && <nav className="siderail" aria-label="Main"><Logo /><div className="rail-nav">{nav}</div></nav>}

      <main className="main">
        <div className="topbar">
          {!desktop && <Logo />}
          {desktop && route.name !== 'search' ? <TopSearch /> : <span className="grow" />}
          {desktop && <ThemeControls />}
          <RoomChip />
          <Identity />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pageKey} className="page-wrap" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
            {page}
          </motion.div>
        </AnimatePresence>
      </main>

      {desktop ? (
        <aside className={`side ${chatMode && track ? 'chat-mode' : ''}`}>
          <div className="panel np-panel" onPointerDown={(e) => !(e.target as HTMLElement).closest('button, input, a, .wave-bars') && setChatMode(false)}>
            <NowPlaying variant="panel" />
          </div>
          <div className="panel chat-panel" onFocusCapture={(e) => !(e.target as HTMLElement).closest('.side-swap') && setChatMode(true)} onPointerDown={(e) => !(e.target as HTMLElement).closest('.side-swap') && setChatMode(true)}>
            {track && (
              <button className="side-swap" onClick={() => setChatMode((m) => !m)} aria-label={chatMode ? 'Back to the player' : 'Open the chat'} title={chatMode ? 'Back to the player' : 'Open the chat'}>
                {chatMode ? <ChevronsDown size={18} /> : <ChevronsUp size={18} />}
              </button>
            )}
            <Chat embedded />
          </div>
        </aside>
      ) : (
        <>
          <div className="dock">
            <AnimatePresence>{track && <MiniPlayer onOpen={() => setSheet(true)} />}</AnimatePresence>
            <nav className="tabbar" aria-label="Main">{nav}</nav>
          </div>
          <AnimatePresence>
            {sheet && track && (
              <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 280, damping: 32 }}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_e, info) => (info.offset.y > 110 || info.velocity.y > 600) && closeSheet()}
              >
                <div className="sheet-handle" onPointerDown={(e) => dragControls.start(e)} aria-hidden><span className="grabber" /></div>
                <NowPlaying variant="sheet" onClose={closeSheet} onDragStart={(e) => dragControls.start(e)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Theater />
      <VideoHost />
      <ShareSheet />
      <MediaViewer />
      <Cursor />
      <Reactions />
      <Toasts />
    </div>
  );
}
