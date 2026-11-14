import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Play, Radio as RadioIcon, Search as SearchIcon, X } from 'lucide-react';
import { ARTISTS, RADIO_TABS, VIBES, artistById, festById, festState, findArtist, findFestival, findVibe, sortedFestivals, vibeById, type Festival, type Query, type Vibe } from '../lib/catalog';
import { PALETTE } from '../lib/color';
import { searchSongs } from '../lib/songs';
import { searchStations, stationsFor } from '../lib/radio';
import { useFloor } from '../lib/floor';
import { usePlayer } from '../lib/player';
import { back, go, linkProps } from '../lib/router';
import type { Track } from '../lib/types';
import { DotGlyph, DotText, FlowArt } from './Art';
import { Rail, RowSkeleton, StationTile, TileSkeleton, TrackRow, useListeners } from './Lists';
import { ArtistCard, FestCard, VibeTile, festLabel } from './Tiles';
import { playCollection } from './collection';

type Load<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error' };

function useLoad<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): [Load<T>, () => void] {
  const [s, set] = useState<Load<T>>({ state: 'loading' });
  const [n, setN] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    set({ state: 'loading' });
    fn(ctl.signal).then((data) => !ctl.signal.aborted && set({ state: 'ok', data })).catch(() => !ctl.signal.aborted && set({ state: 'error' }));
    return () => ctl.abort();
  }, [...deps, n]);
  return [s, () => setN((x) => x + 1)];
}

function Empty({ glyph = 'sad', text, retry }: { glyph?: 'sad' | 'search' | 'heart' | 'radio' | 'note'; text: string; retry?: () => void }) {
  return (
    <div className="empty">
      <DotGlyph glyph={glyph} size={56} mode="build" />
      <p>{text}</p>
      {retry && <button className="btn ghost" onClick={retry}>Try again</button>}
    </div>
  );
}

function SectionHead({ title, kicker, to }: { title: string; kicker?: string; to?: string }) {
  return (
    <div className="shead">
      <div>
        {kicker && <span className="kicker doto">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {to && <a className="see-all" {...linkProps(to)}>See all</a>}
    </div>
  );
}

function SongList({ q, context, limit }: { q: string; context: string; limit?: number }) {
  const [s, retry] = useLoad((sig) => searchSongs(q, sig), [q]);
  if (s.state === 'loading') return <RowSkeleton n={limit ?? 8} />;
  if (s.state === 'error') return <Empty text="Songs didn't load. Check your connection." retry={retry} />;
  const list = limit ? s.data.slice(0, limit) : s.data;
  if (!list.length) return <Empty glyph="search" text="No songs found." />;
  return <div className="rows">{list.map((t, i) => <TrackRow key={t.id} track={t} queue={s.data} context={context} index={i} />)}</div>;
}

function StationGrid({ queries, context, term }: { queries?: Query[]; term?: string; context: string }) {
  const listeners = useListeners();
  const [s, retry] = useLoad((sig) => (term ? searchStations(term, sig) : stationsFor(queries!, sig)), [term ?? JSON.stringify(queries)]);
  if (s.state === 'loading') return <TileSkeleton />;
  if (s.state === 'error') return <Empty glyph="radio" text="The radio directory didn't answer. Try again." retry={retry} />;
  if (!s.data.length) return <Empty glyph="radio" text="No live stations for this one yet." />;
  return <div className="tiles">{s.data.map((t, i) => <StationTile key={t.id} track={t} queue={s.data} context={context} index={i} listeners={listeners(t.id)} />)}</div>;
}

// ---------------------------------------------------------------- Home

export function Home() {
  const total = useFloor((s) => s.users.length);
  const status = useFloor((s) => s.status);
  const spots = useFloor((s) => s.spots);
  const playing = usePlayer((s) => s.status === 'playing');
  const fests = useMemo(() => sortedFestivals(), []);
  const desi = VIBES.filter((v) => v.desi);
  const big = desi.slice(0, 3);
  return (
    <div className="page home">
      <header className="hero">
        <DotText text="JAM" colors={[PALETTE.saffron, PALETTE.magenta]} energy={playing ? 1 : 0} className="hero-dots" />
        <div className="hero-side">
          <div className="live-count">
            <i className={`live-dot ${status === 'live' ? '' : 'off'}`} />
            <b className="doto">{String(total).padStart(3, '0')}</b>
            <span>{status === 'live' ? 'on the floor right now' : status === 'connecting' ? 'joining the floor…' : 'floor offline, music still works'}</span>
          </div>
          <h1>Aaj kya sunoge?</h1>
          <p>Every free radio and every song, on one shared floor. No rooms, no sign-up.</p>
          <a className="search-pill" {...linkProps('/search')}>
            <SearchIcon size={18} />
            <span>Songs, artists, stations, festivals…</span>
          </a>
        </div>
      </header>

      <section>
        <SectionHead kicker="00" title="One tap radio" to="/radio" />
        <div className="onetap">
          {ONE_TAP.map((v, i) => (
            <motion.button key={v.id} className="tap" style={{ '--c': v.colors[0], '--c2': v.colors[1] } as React.CSSProperties} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => playCollection({ songs: v.songs, radio: v.radio, label: v.label }, 'radio')}>
              <FlowArt seed={v.id + 'tap'} colors={v.colors} pattern={v.pattern} density={0.6} energy={0.6} />
              <span className="tap-play"><Play size={18} fill="currentColor" /></span>
              <b>{v.label}</b>
              <small className="doto">RADIO · SCREEN-OFF OK</small>
            </motion.button>
          ))}
        </div>
      </section>

      <section>
        <SectionHead kicker="01" title="Desi first" />
        <div className="big-tiles">{big.map((v, i) => <VibeTile key={v.id} vibe={v} index={i} />)}</div>
      </section>

      <section>
        <SectionHead kicker="02" title="Voices" />
        <Rail className="artists">{ARTISTS.map((a, i) => <ArtistCard key={a.id} artist={a} index={i} />)}</Rail>
      </section>

      <section>
        <SectionHead kicker="03" title="Trending in India" to="/vibe/hindi" />
        <SongList q={`trending hindi punjabi songs ${new Date().getFullYear()}`} context="Trending in India" limit={8} />
      </section>

      <section>
        <SectionHead kicker="04" title="Festivals & moods" />
        <Rail>{fests.map(({ f, s }, i) => <FestCard key={f.id} fest={f} state={s} index={i} />)}</Rail>
      </section>

      {spots.length > 0 && (
        <section>
          <SectionHead kicker="05" title="Live on the floor" to="/floor" />
          <Rail>{spots.slice(0, 12).map((s, i) => (s.track.kind === 'radio'
            ? <StationTile key={s.track.id} track={s.track} queue={spots.map((x) => x.track)} context="The floor" index={i} listeners={s.count} />
            : <FloorSongTile key={s.track.id} track={s.track} count={s.count} at={s.at} />))}</Rail>
        </section>
      )}

      <section>
        <SectionHead kicker="06" title="More desi" />
        <div className="small-tiles">{desi.slice(3).map((v, i) => <VibeTile key={v.id} vibe={v} size="small" index={i} />)}</div>
      </section>

      <section>
        <SectionHead kicker="07" title="Around the world" />
        <div className="small-tiles">{VIBES.filter((v) => !v.desi).map((v, i) => <VibeTile key={v.id} vibe={v} size="small" index={i} />)}</div>
      </section>
      <div className="foot doto">JAM · free radio + songs · one floor</div>
    </div>
  );
}

function FloorSongTile({ track, count, at }: { track: Track; count: number; at: number }) {
  return (
    <div className="tile">
      <button className="tile-art" onClick={() => usePlayer.getState().play(track, [track], 'The floor', at)} aria-label={`Join ${count} listening to ${track.title}`}>
        <img className="tile-thumb" src={track.art} alt="" loading="lazy" />
        <span className="tile-fab"><Play size={20} fill="currentColor" /></span>
        <span className="tile-badge doto"><i className="live-dot" />{count}</span>
      </button>
      <div className="tile-meta"><div className="tile-text"><b>{track.title}</b><small>{track.subtitle}</small></div></div>
    </div>
  );
}

// ---------------------------------------------------------------- Vibe / festival

export function Collection({ kind, id }: { kind: 'vibe' | 'fest' | 'artist'; id: string }) {
  const item: Vibe | Festival | undefined = kind === 'vibe' ? vibeById(id) : kind === 'artist' ? artistById(id) : festById(id);
  const [tab, setTab] = useState<'songs' | 'radio'>('songs');
  const playing = usePlayer((s) => s.status === 'playing');
  useEffect(() => setTab('songs'), [id]);
  if (!item) return <div className="page"><Empty text="That page doesn't exist." retry={() => go('/')} /></div>;
  const fest = kind === 'fest' ? (item as Festival) : null;
  const state = fest ? festState(fest) : null;

  return (
    <div className="page collection" style={{ '--c': item.colors[0], '--c2': item.colors[1] } as React.CSSProperties}>
      <header className="banner">
        <FlowArt seed={item.id} colors={item.colors} pattern={item.pattern} animate energy={playing ? 1.1 : 0.7} />
        <span className="banner-shade" />
        <button className="icon-btn glass back" onClick={back} aria-label="Back"><ArrowLeft size={20} /></button>
        <div className="banner-text">
          {state && <span className={`pill ${state.state}`}>{state.state === 'now' && <i className="live-dot" />}{festLabel(state)}</span>}
          <h1>{item.label}</h1>
          {kind === 'artist' && <span className="kicker doto">VOICE</span>}
          <p>{item.sub}</p>
          <div className="btn-row">
            <button className="btn primary" onClick={() => playCollection({ songs: item.songs, radio: item.radio, label: item.label })}><Play size={18} fill="currentColor" /> Play songs</button>
            <button className="btn glass" onClick={() => playCollection({ songs: item.songs, radio: item.radio, label: item.label }, 'radio')}><RadioIcon size={18} /> Radio</button>
          </div>
        </div>
      </header>
      <div className="texttabs" role="tablist">
        {(['songs', 'radio'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'songs' ? 'Songs' : 'Live radio'}
          </button>
        ))}
      </div>
      {tab === 'songs' && <p className="hint">Songs play from YouTube and pause when your screen locks. For gym or screen-off listening, use Live radio.</p>}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {tab === 'songs' ? <SongList q={item.songs} context={item.label} /> : <StationGrid queries={item.radio} context={`${item.label} radio`} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- Search

const ONE_TAP = ['hindi', 'punjabi', 'retro-hindi', 'bhakti'].map((id) => vibeById(id)!);

const SUGGEST = ['90s bollywood romantic', 'Kesariya', 'Tum Hi Ho', 'Chhath geet', 'Bhangra party', 'Old is gold', 'Sharda Sinha', 'Gurbani', 'Garba', 'Sufi night'];

export function Search({ q }: { q: string }) {
  const [text, setText] = useState(q);
  const input = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(q.trim());
  const fests = useMemo(() => sortedFestivals().slice(0, 8), []);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      const v = text.trim();
      setTerm(v);
      if (v !== q) go(v ? `/search?q=${encodeURIComponent(v)}` : '/search', { replace: true });
    }, 450);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => { const el = input.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, []);
  const fest = term ? findFestival(term) : undefined;
  const singer = term && !fest ? findArtist(term) : undefined;
  const vibe = term && !fest && !singer ? findVibe(term) : undefined;
  const shortcut = fest || singer || vibe;
  const shortcutPath = fest ? `/fest/${fest.id}` : singer ? `/artist/${singer.id}` : `/vibe/${vibe?.id}`;

  return (
    <div className="page search-page">
      <label className="search-box">
        <SearchIcon size={20} />
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Songs, artists, stations, festivals…" aria-label="Search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), setTerm(text.trim()))} />
        {text && <button className="icon-btn" onClick={() => { setText(''); input.current?.focus(); }} aria-label="Clear"><X size={18} /></button>}
      </label>

      {!term ? (
        <>
          <section>
            <SectionHead title="Festivals & moods" />
            <Rail>{fests.map(({ f, s }, i) => <FestCard key={f.id} fest={f} state={s} index={i} />)}</Rail>
          </section>
          <section>
            <SectionHead title="Voices" />
            <Rail className="artists">{ARTISTS.map((a, i) => <ArtistCard key={a.id} artist={a} index={i} />)}</Rail>
          </section>
          <section>
            <SectionHead title="Try a search" />
            <div className="tryline">{SUGGEST.map((s, i) => <span key={s} style={{ display: 'contents' }}>{i > 0 && <span aria-hidden>●</span>}<button onClick={() => setText(s)}>{s}</button></span>)}</div>
          </section>
          <section>
            <SectionHead title="Languages & genres" />
            <div className="small-tiles">{VIBES.slice(0, 12).map((v, i) => <VibeTile key={v.id} vibe={v} size="small" index={i} />)}</div>
          </section>
        </>
      ) : (
        <>
          {shortcut && (
            <a className="shortcut" style={{ '--c': shortcut.colors[0], '--c2': shortcut.colors[1] } as React.CSSProperties} {...linkProps(shortcutPath)}>
              <FlowArt seed={shortcut.id} colors={shortcut.colors} pattern={shortcut.pattern} animate energy={0.8} />
              <span className="vtile-shade" />
              <span className="vtile-text"><small className="doto">{fest ? 'FESTIVAL' : singer ? 'VOICE' : 'VIBE'}</small><b>{shortcut.label}</b><small>{shortcut.sub}</small></span>
            </a>
          )}
          <section>
            <SectionHead title="Songs" />
            <SongList q={fest ? `${term}||${fest.songs}` : term} context={`Search: ${term}`} limit={20} />
          </section>
          <section>
            <SectionHead title="Live stations" />
            <StationGrid term={fest ? undefined : term} queries={fest?.radio} context={`Search: ${term}`} />
          </section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Radio hub

export function RadioHub({ tab }: { tab: string }) {
  const current = RADIO_TABS.find((t) => t.id === tab) || RADIO_TABS[0];
  const playing = usePlayer((s) => s.track?.kind === 'radio' && s.status === 'playing');
  return (
    <div className="page radio-hub">
      <header className="hub-head">
        <DotText text="LIVE" colors={[PALETTE.phosphor, PALETTE.cyan]} energy={playing ? 1 : 0} className="hub-dots" />
        <div>
          <h1>Radio & FM</h1>
          <p>Thousands of live stations. They keep playing with your screen off, so this is the one for the gym, the drive and the night.</p>
        </div>
      </header>
      <nav className="texttabs" aria-label="Radio categories">
        {RADIO_TABS.map((t) => (
          <a key={t.id} {...linkProps(`/radio/${t.id}`)} className={t.id === current.id ? 'on' : ''} aria-current={t.id === current.id ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>
      <StationGrid key={current.id} queries={current.radio} context={`${current.label} radio`} />
    </div>
  );
}
