import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { colorsFor } from '../lib/color';
import { useFloor } from '../lib/floor';
import { usePlayer } from '../lib/player';
import { useLikes } from '../lib/likes';
import { Avatar, GlyphArt } from './Art';
import { StationCard } from './StationCard';

export function FloorView() {
  const { users, stations, total, connected, myId } = useFloor();
  const currentId = usePlayer((s) => s.station?.id);
  const byStation = useMemo(() => {
    const m = new Map<string, typeof users>();
    for (const u of users) if (u.stationId) m.set(u.stationId, [...(m.get(u.stationId) || []), u]);
    return m;
  }, [users]);
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);

  return (
    <div className="view">
      <header className="hero small">
        <div className="kicker">
          <i className={`live-dot ${connected ? '' : 'off'}`} />
          {connected ? 'live' : 'reconnecting…'}
        </div>
        <h1>
          The floor
          <span className="doto count">{String(total).padStart(3, '0')}</span>
        </h1>
        <p className="hero-sub">Everyone who’s here, and what they’re listening to. Tap a station or a person to jump in with them.</p>
      </header>

      {stations.length === 0 ? (
        <div className="empty">
          <div className="doto empty-glyph">~</div>
          <p>{connected ? 'Nobody’s playing anything yet. Start a station and you’ll light up the floor.' : 'The floor is offline. You can still listen; we’ll reconnect automatically.'}</p>
        </div>
      ) : (
        <div className="clusters">
          <AnimatePresence>
            {stations.map((s) => {
              const crowd = (byStation.get(s.id) || []).slice(0, 10);
              const [c] = colorsFor(s.id);
              return (
                <motion.button
                  layout
                  key={s.id}
                  className={`cluster ${currentId === s.id ? 'current' : ''}`}
                  style={{ '--c': c } as React.CSSProperties}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => usePlayer.getState().play(s, stations)}
                  aria-label={`Join ${s.count} listening to ${s.name}`}
                >
                  <span className="orbit-wrap">
                    <span className="ring" />
                    <span className="ring r2" />
                    <span className="cluster-art">
                      <GlyphArt seed={s.id} favicon={s.favicon} />
                    </span>
                    <span className="orbit" style={{ animationDuration: `${26 + (s.id.length % 5) * 4}s` }}>
                      {crowd.map((u, i) => (
                        <span key={u.id} className="orbiter" style={{ transform: `rotate(${(360 / crowd.length) * i}deg) translateY(-68px)` }}>
                          <Avatar seed={u.name} color={u.color} size={26} />
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="cluster-name">{s.name}</span>
                  <span className="cluster-count">
                    <b className="doto">{s.count}</b> jamming
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {users.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Everyone here</h2>
            {total > users.length && <span className="muted">showing {users.length} of {total}</span>}
          </div>
          <div className="people">
            {users.map((u) => {
              const st = u.stationId ? stationById.get(u.stationId) : undefined;
              return (
                <button key={u.id} className="person" disabled={!st} onClick={() => st && usePlayer.getState().play(st, stations)} title={st ? `Join ${u.name} on ${st.name}` : `${u.name} is just hanging out`}>
                  <Avatar seed={u.name} color={u.color} size={30} />
                  <span>
                    <b style={{ color: u.color }}>{u.name}{u.id === myId ? ' (you)' : ''}</b>
                    <small>{st ? st.name : 'hanging out'}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export function LikesView() {
  const likes = useLikes((s) => s.likes);
  return (
    <div className="view">
      <header className="hero small">
        <h1>
          Your likes
          <span className="doto count">{String(likes.length).padStart(2, '0')}</span>
        </h1>
      </header>
      {likes.length === 0 ? (
        <div className="empty">
          <div className="doto empty-glyph">♡</div>
          <p>Tap the heart on any station to keep it here. Saved on this device.</p>
        </div>
      ) : (
        <div className="grid">
          {likes.map((s, i) => (
            <StationCard key={s.id} station={s} queue={likes} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Chat() {
  const messages = useFloor((s) => s.messages);
  const connected = useFloor((s) => s.connected);
  const myId = useFloor((s) => s.myId);
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    useFloor.getState().clearUnread();
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !connected) return;
    useFloor.getState().sendChat(t);
    setText('');
    stick.current = true;
  };

  return (
    <div className="chat">
      <div className="chat-head">
        <h2>Floor chat</h2>
        <span className="muted">
          <i className={`live-dot ${connected ? '' : 'off'}`} /> {connected ? 'everyone sees this' : 'offline'}
        </span>
      </div>
      <div
        className="chat-list"
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages.length === 0 && <p className="chat-empty">Quiet in here. Say hi, drop a station rec, start something.</p>}
        {messages.map((m) => (
          <motion.div key={m.id} className={`msg ${m.user.id === myId ? 'mine' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Avatar seed={m.user.name} color={m.user.color} size={28} />
            <div>
              <div className="msg-head">
                <b style={{ color: m.user.color }}>{m.user.name}</b>
                {m.station && <small>on {m.station}</small>}
              </div>
              <p>{m.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder={connected ? 'Say something to the floor…' : 'Reconnecting…'} aria-label="Message" disabled={!connected} enterKeyHint="send" />
        <button type="submit" disabled={!text.trim() || !connected} aria-label="Send">
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}
