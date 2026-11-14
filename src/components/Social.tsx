import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Play } from 'lucide-react';
import { colorsFor } from '../lib/color';
import { RELAYS, useFloor } from '../lib/floor';
import { usePlayer } from '../lib/player';
import { useLikes } from '../lib/likes';
import { Avatar, Cover, DotGlyph, DotText, Eq } from './Art';
import { REACTIONS } from '../lib/glyphs';
import { StationTile, TrackRow } from './Lists';
import { PALETTE } from '../lib/color';

export function FloorView() {
  const users = useFloor((s) => s.users);
  const spots = useFloor((s) => s.spots);
  const status = useFloor((s) => s.status);
  const currentId = usePlayer((s) => s.track?.id);
  const join = (i: number) => {
    const s = spots[i];
    usePlayer.getState().play(s.track, spots.map((x) => x.track), 'The floor', s.at);
  };

  return (
    <div className="page floor">
      <header className="floor-head">
        <span className="kicker doto"><i className={`live-dot ${status === 'live' ? '' : 'off'}`} />{status === 'live' ? 'LIVE' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</span>
        <DotText text={String(users.length).padStart(3, '0')} colors={[PALETTE.phosphor, PALETTE.lime, PALETTE.cyan]} className="floor-count" />
        <h1>on the floor</h1>
        <p>Everyone here, and what they're playing. Tap a circle to jump in. Songs join at the same second.</p>
      </header>

      {spots.length === 0 ? (
        <div className="empty">
          <DotGlyph glyph="note" size={56} mode="build" />
          <p>{status === 'offline' ? "Can't reach the floor right now. Music still works, we'll keep trying." : "Nobody's playing yet. Start something and light up the floor."}</p>
        </div>
      ) : (
        <div className="orbits">
          <AnimatePresence>
            {spots.map((s, i) => {
              const [c, c2] = colorsFor(s.track.id);
              const crowd = s.users.slice(0, 10);
              return (
                <motion.button layout key={s.track.id} className={`orbit-card ${currentId === s.track.id ? 'current' : ''}`} style={{ '--c': c, '--c2': c2 } as React.CSSProperties} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} onClick={() => join(i)} aria-label={`Join ${s.count} on ${s.track.title}`}>
                  <span className="orbit-wrap">
                    <span className="ring r1" />
                    <span className="ring r2" />
                    <span className="orbit-core"><Cover track={s.track} /></span>
                    <span className="orbit-spin" style={{ animationDuration: `${24 + (i % 4) * 6}s` }}>
                      {crowd.map((u, k) => (
                        <span key={u.id} className="orbiter" style={{ transform: `rotate(${(360 / crowd.length) * k}deg) translateY(-66px)` }}>
                          <Avatar seed={u.id} color={u.color} size={24} />
                        </span>
                      ))}
                    </span>
                  </span>
                  <b>{s.track.title}</b>
                  <small><span className="doto">{s.count}</span> jamming · {s.track.kind === 'radio' ? 'radio' : 'song'}</small>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <section>
        <div className="shead"><h2>Everyone</h2></div>
        <div className="people">
          {users.map((u) => (
            <button key={u.id} className="person" disabled={!u.track || u.me} onClick={() => u.track && usePlayer.getState().play(u.track, [u.track], `With ${u.name}`, u.at)}>
              <Avatar seed={u.id} color={u.color} size={34} />
              <span>
                <b style={{ color: u.color }}>{u.name}{u.me ? ' (you)' : ''}</b>
                <small>{u.track ? u.track.title : 'Just hanging out'}</small>
              </span>
              {u.track && !u.me && <Play size={14} fill="currentColor" />}
            </button>
          ))}
        </div>
      </section>
      <p className="fine">Floor runs on {RELAYS.length} public Nostr relays. Your name and what you play are public to everyone here.</p>
    </div>
  );
}

const ago = (ts: number) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

function OnTheFloor() {
  const spots = useFloor((s) => s.spots);
  if (!spots.length) return null;
  return (
    <div className="chat-onfloor">
      <span className="doto">PLAYING ON THE FLOOR</span>
      <div className="onfloor-list">
        {spots.slice(0, 4).map((s) => (
          <button key={s.track.id} className="onfloor" onClick={() => usePlayer.getState().play(s.track, spots.map((x) => x.track), 'The floor', s.at)} title={`Join ${s.track.title}`}>
            <span className="onfloor-art"><Cover track={s.track} /></span>
            <span className="onfloor-text"><b>{s.track.title}</b><small className="doto">{s.count} IN</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chat({ embedded }: { embedded?: boolean }) {
  const messages = useFloor((s) => s.messages);
  const status = useFloor((s) => s.status);
  const myId = useFloor((s) => s.myId);
  const users = useFloor((s) => s.users);
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [, tick] = useState(0);

  useEffect(() => {
    useFloor.getState().clearUnread();
    const el = list.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(id); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    stick.current = true;
    setText('');
    const ok = await useFloor.getState().sendChat(t);
    if (!ok) setText((cur) => cur || t);
  };

  return (
    <div className={`chat ${embedded ? 'embedded' : ''}`}>
      <div className="chat-head">
        <div>
          <h2>Floor chat</h2>
          <small>{status === 'live' ? 'Everyone on JAM sees this' : status === 'connecting' ? 'Connecting to the floor…' : 'Offline, retrying'}</small>
        </div>
        <div className="chat-live">
          <span className="stack">{users.slice(0, 4).map((u) => <Avatar key={u.id} seed={u.id} color={u.color} size={26} />)}</span>
          <span className="chat-count doto"><i className={`live-dot ${status === 'live' ? '' : 'off'}`} />{String(users.length).padStart(2, '0')}</span>
        </div>
      </div>

      <OnTheFloor />

      <div className="chat-list" ref={list} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <DotGlyph glyph="wave" size={52} mode="pulse" color="var(--accent)" />
            <b>It's quiet on the floor</b>
            <p>Say namaste, drop a song rec, start something.</p>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.sys) {
            return (
              <motion.div key={m.id} className="sysline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <i style={{ background: m.user.color }} />
                <span><b style={{ color: m.user.color }}>{m.user.name}</b> {m.text}</span>
                <time className="doto">{ago(m.ts)}</time>
              </motion.div>
            );
          }
          const prev = messages[i - 1];
          const mine = m.user.id === myId;
          const grouped = !!prev && !prev.sys && prev.user.id === m.user.id && m.ts - prev.ts < 180000;
          return (
            <motion.div key={m.id} className={`msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}`} style={{ '--uc': m.user.color } as React.CSSProperties} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
              {!mine && <span className="msg-av">{!grouped && <Avatar seed={m.user.id} color={m.user.color} size={32} />}</span>}
              <div className="msg-body">
                {!grouped && (
                  <div className="msg-head">
                    {!mine && <b>{m.user.name}</b>}
                    <time className="doto">{ago(m.ts)}</time>
                  </div>
                )}
                <p className="msg-text">{m.text}</p>
                {!grouped && m.on && <span className="msg-on doto"><Eq on={false} />{m.on}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="composer">
        <div className="quick" aria-label="Quick reactions">
          {REACTIONS.map((r) => (
            <motion.button key={r.id} type="button" whileTap={{ scale: 1.35, rotate: -8 }} onClick={() => useFloor.getState().react(r.id)} aria-label={`React: ${r.label}`} style={{ color: r.color }}>
              <DotGlyph glyph={r.id} size={18} />
            </motion.button>
          ))}
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Message the floor" aria-label="Message" enterKeyHint="send" autoComplete="off" />
          <motion.button type="submit" whileTap={{ scale: 0.85 }} disabled={!text.trim()} aria-label="Send"><ArrowUp size={19} strokeWidth={2.6} /></motion.button>
        </form>
      </div>
    </div>
  );
}

export function Likes() {
  const likes = useLikes((s) => s.likes);
  const songs = likes.filter((t) => t.kind === 'song');
  const radios = likes.filter((t) => t.kind === 'radio');
  return (
    <div className="page likes">
      <header className="page-head">
        <span className="kicker doto">{String(likes.length).padStart(2, '0')} SAVED</span>
        <h1>Your likes</h1>
      </header>
      {likes.length === 0 ? (
        <div className="empty">
          <DotGlyph glyph="heart" size={64} mode="pulse" color={PALETTE.red} />
          <p>Tap the heart on any song or station to keep it here. Saved on this device.</p>
        </div>
      ) : (
        <>
          {songs.length > 0 && <section><div className="shead"><h2>Songs</h2></div><div className="rows">{songs.map((t, i) => <TrackRow key={t.id} track={t} queue={songs} context="Your likes" index={i} />)}</div></section>}
          {radios.length > 0 && <section><div className="shead"><h2>Stations</h2></div><div className="tiles">{radios.map((t, i) => <StationTile key={t.id} track={t} queue={radios} context="Your likes" index={i} />)}</div></section>}
        </>
      )}
    </div>
  );
}
