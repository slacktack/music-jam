import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AtSign, Copy, Lock, LogOut, Mail, MessageCircle, Phone, Send, Share2, X } from 'lucide-react';
import { useFloor } from '../lib/floor';
import { copyText, targets, useShare } from '../lib/share';
import { go } from '../lib/router';
import { DotGlyph } from './Art';

const ICONS = { whatsapp: MessageCircle, telegram: Send, x: AtSign, mail: Mail, sms: Phone } as const;

/**
 * The sheet JAM draws itself. Sharing a song or a station stays a plain public
 * link — anyone can open it and drop onto the floor. A private room is never
 * implied by that link: it only appears once you create one, deliberately.
 */
export function ShareSheet() {
  const item = useShare((s) => s.item);
  const close = useShare((s) => s.close);
  const room = useFloor((s) => s.room);
  const createRoom = useFloor((s) => s.createRoom);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [item, close]);

  if (!item) return null;
  const isRoom = item.kind === 'room';

  return (
    <>
      <motion.div className="scrim share-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
      <motion.div
        className="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${item.title}`}
        initial={{ y: '100%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        <div className="share-head">
          <span className="doto"><Share2 size={12} /> SHARE</span>
          <button className="icon-btn" onClick={close} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="share-what">
          <span className="share-art">{item.art ? <img src={item.art} alt="" /> : <DotGlyph glyph={isRoom ? 'heart' : 'note'} size={34} />}</span>
          <span className="share-text">
            <b>{item.title}</b>
            <small>{item.kind === 'room' ? 'Private room · link only' : item.kind === 'radio' ? 'Live radio' : item.kind === 'song' ? item.subtitle || 'On YouTube' : 'On JAM'}</small>
          </span>
        </div>

        <section className="share-dest">
          <span className="doto">{isRoom ? 'THE ROOM LINK' : 'SEND THIS'}</span>
          <div className="share-link">
            <input readOnly value={item.url} aria-label="Link" onFocus={(e) => e.currentTarget.select()} />
            <button onClick={() => copyText(item.url)} aria-label="Copy link"><Copy size={16} /></button>
          </div>
          <div className="share-grid">
            {targets(item).map((t) => {
              const Icon = ICONS[t.id as keyof typeof ICONS];
              return (
                <a key={t.id} className="share-tile" href={t.href} target={t.id === 'sms' || t.id === 'mail' ? undefined : '_blank'} rel="noreferrer">
                  <Icon size={19} />
                  <span>{t.label}</span>
                </a>
              );
            })}
            {typeof navigator.share === 'function' && (
              <button
                className="share-tile"
                onClick={() => navigator.share({ title: 'JAM', text: item.title, url: item.url }).catch((e: any) => { if (e?.name && e.name !== 'AbortError') copyText(item.url); })}
              >
                <Share2 size={19} />
                <span>More apps</span>
              </button>
            )}
          </div>
          <p className="fine">Whoever opens this lands on JAM in their browser. No app, no sign-up, nothing to install.</p>
        </section>

        {!isRoom && (
          <section className={`share-room ${room ? 'armed' : ''}`}>
            {room ? (
              <>
                <header>
                  <span className="doto"><Lock size={11} /> YOUR ROOM IS OPEN</span>
                  <p>{room.name} exists right now. This link is the only key — send it and they are in with you, invisible to everyone on the floor.</p>
                </header>
                <div className="share-link">
                  <input readOnly value={room.link} aria-label="Room link" onFocus={(e) => e.currentTarget.select()} />
                  <button onClick={() => copyText(room.link)} aria-label="Copy room link"><Copy size={16} /></button>
                </div>
                <div className="btn-row">
                  <button className="btn primary" onClick={() => { close(); useShare.getState().open({ title: room.name, url: room.link, kind: 'room' }); }}><Send size={16} /> Send the invite</button>
                  <button className="btn ghost" onClick={() => { close(); go('/floor'); }}><LogOut size={16} /> Manage room</button>
                </div>
              </>
            ) : (
              <>
                <header>
                  <span className="doto"><Lock size={11} /> KEEP IT PRIVATE</span>
                  <p>Sharing above is public, like the floor. Want a room only your people can read? Create one — it is yours forever, and the link carries the key.</p>
                </header>
                <button
                  className="btn primary"
                  onClick={() => { createRoom(); close(); go('/floor'); }}
                >
                  <Lock size={16} /> Create a private room
                </button>
              </>
            )}
          </section>
        )}
      </motion.div>
    </>
  );
}
