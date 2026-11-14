import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Station } from '../lib/types';
import { FALLBACK, VIBES, fetchVibe, searchStations } from '../lib/radio';
import { useFloor } from '../lib/floor';
import { StationCard } from './StationCard';

const cache = new Map<string, Station[]>();

export function Discover() {
  const [vibeId, setVibeId] = useState(() => localStorage.getItem('jam.vibe') || 'trending');
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'fallback' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const floorStations = useFloor((s) => s.stations);
  const total = useFloor((s) => s.total);
  const connected = useFloor((s) => s.connected);
  const chips = useRef<HTMLDivElement>(null);

  const vibe = VIBES.find((v) => v.id === vibeId) || VIBES[0];

  useEffect(() => {
    const t = setTimeout(() => setQuery(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const key = query ? `q:${query.toLowerCase()}` : `v:${vibe.id}`;
    const hit = cache.get(key);
    if (hit) {
      setStations(hit);
      setState('ok');
      return;
    }
    const ctl = new AbortController();
    setState('loading');
    (query ? searchStations(query, ctl.signal) : fetchVibe(vibe, ctl.signal))
      .then((list) => {
        cache.set(key, list);
        setStations(list);
        setState('ok');
      })
      .catch(() => {
        if (ctl.signal.aborted) return;
        if (!query && vibe.id === 'trending') {
          setStations(FALLBACK);
          setState('fallback');
        } else {
          setStations([]);
          setState('error');
        }
      });
    return () => ctl.abort();
  }, [vibe, query, attempt]);

  const counts = useMemo(() => new Map(floorStations.map((s) => [s.id, s.count])), [floorStations]);

  const pickVibe = (id: string) => {
    setTerm('');
    setQuery('');
    setVibeId(id);
    localStorage.setItem('jam.vibe', id);
  };

  return (
    <div className="view">
      <header className="hero">
        <div className="kicker">
          <i className={`live-dot ${connected ? '' : 'off'}`} />
          {connected ? (
            <>
              <b className="doto">{String(total).padStart(3, '0')}</b> on the floor right now
            </>
          ) : (
            'connecting to the floor…'
          )}
        </div>
        <h1>
          Every radio.
          <br />
          <span className="grad">One floor.</span>
        </h1>
        <p className="hero-sub">Tune into any free live station on earth. Everyone here is in the same room, no invites, no setup. Just press play.</p>
        <label className="search">
          <Search size={18} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search stations, genres, languages…" aria-label="Search stations" enterKeyHint="search" />
          {term && (
            <button className="icon-btn" onClick={() => setTerm('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
      </header>

      <div className="chips" ref={chips} role="tablist" aria-label="Vibes">
        {VIBES.map((v) => (
          <button key={v.id} role="tab" aria-selected={!query && v.id === vibe.id} className={`chip ${!query && v.id === vibe.id ? 'on' : ''}`} style={{ '--c': v.color } as React.CSSProperties} onClick={() => pickVibe(v.id)}>
            <i />
            {v.label}
          </button>
        ))}
      </div>

      {floorStations.length > 0 && !query && (
        <section>
          <div className="section-head">
            <h2>Live on the floor</h2>
            <span className="muted">what people are jamming to</span>
          </div>
          <div className="row">
            {floorStations.slice(0, 12).map((s, i) => (
              <StationCard key={s.id} station={s} queue={floorStations} index={i} listeners={s.count} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>{query ? `Results for “${query}”` : vibe.label}</h2>
          {state === 'ok' && <span className="muted doto">{stations.length} stations</span>}
        </div>
        {state === 'fallback' && <div className="notice">Couldn’t reach the station directory, so here’s a hand-picked set from SomaFM. <button onClick={() => setAttempt((a) => a + 1)}>Retry</button></div>}
        {state === 'loading' && (
          <div className="grid">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="card skeleton" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="card-art" />
                <div className="sk-line" />
                <div className="sk-line short" />
              </div>
            ))}
          </div>
        )}
        {state === 'error' && (
          <div className="empty">
            <div className="doto empty-glyph">:(</div>
            <p>Couldn’t load stations. Check your connection and try again.</p>
            <button className="pill-btn" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
          </div>
        )}
        {state === 'ok' && stations.length === 0 && (
          <div className="empty">
            <div className="doto empty-glyph">0</div>
            <p>No stations found{query ? ` for “${query}”` : ''}. Try another search or vibe.</p>
          </div>
        )}
        {(state === 'ok' || state === 'fallback') && stations.length > 0 && (
          <div className="grid" key={query || vibe.id}>
            {stations.map((s, i) => (
              <StationCard key={s.id} station={s} queue={stations} index={i} listeners={counts.get(s.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
