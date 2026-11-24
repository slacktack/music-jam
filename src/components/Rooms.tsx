import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Lock, LogOut, Share2, Unlink } from 'lucide-react';
import { useFloor } from '../lib/floor';
import { copyText, useShare } from '../lib/share';
import { toast } from '../lib/toast';
import { go, linkProps } from '../lib/router';
import { DotGlyph } from './Art';

/**
 * The room panel on the floor page. A room is just a key: creating one is
 * deterministic, so the same person always gets the same code and link.
 */
export function RoomCard() {
  const room = useFloor((s) => s.room);
  const myRoom = useFloor((s) => s.myRoom);
  const users = useFloor((s) => s.users);
  const status = useFloor((s) => s.status);
  const [paste, setPaste] = useState('');

  const invite = room ?? myRoom;
  const share = () =>
    useShare.getState().open({
      title: room ? room.name : `My JAM room`,
      url: invite.link,
      kind: 'room',
    });

  if (room) {
    return (
      <motion.section className="room-card in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <header>
          <span className="room-kicker doto"><Lock size={12} /> PRIVATE ROOM</span>
          <h2>{room.name}</h2>
          <p>{status === 'live' ? `${users.length} ${users.length === 1 ? 'person' : 'people'} in here. Chat and what everyone plays is encrypted — the relay only sees ciphertext.` : 'Connecting… music keeps playing either way.'}</p>
        </header>
        <div className="room-code doto" title="Room code">{room.code}</div>
        <div className="btn-row">
          <button className="btn primary" onClick={share}><Share2 size={17} /> Invite people</button>
          <button className="btn ghost" onClick={() => copyText(room.link)}><Copy size={16} /> Copy link</button>
          <button className="btn ghost" onClick={() => { useFloor.getState().leaveRoom(); go('/floor'); }}><LogOut size={16} /> Leave room</button>
        </div>
        <p className="fine">The link is the only key. Anyone without it sees nothing, and your next room link is always this one.</p>
      </motion.section>
    );
  }

  return (
    <motion.section className="room-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header>
        <span className="room-kicker doto"><Lock size={12} /> PRIVATE ROOM</span>
        <h2>Make a room for your people</h2>
        <p>One tap creates a room that is yours forever. Send the link, and only the people holding it land in the same space — chats, reactions and what everyone is playing, end to end encrypted.</p>
      </header>
      <div className="btn-row">
        <button className="btn primary" onClick={() => { useFloor.getState().createRoom(); go(`/room/${myRoom.code.toLowerCase()}`); }}><Lock size={16} /> Create my room</button>
        <button className="btn ghost" onClick={share}><Share2 size={16} /> Get my invite link</button>
      </div>
      <div className="room-code dim doto" title="Your room code never changes">{myRoom.code}</div>
      <form
        className="room-paste"
        onSubmit={(e) => {
          e.preventDefault();
          const ok = useFloor.getState().joinRoom(paste.trim());
          if (ok) { setPaste(''); go(`/room/${useFloor.getState().room!.code.toLowerCase()}`); } else toast('That link has no room key in it.', 'warn');
        }}
      >
        <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a room link" aria-label="Room link" spellCheck={false} autoComplete="off" />
        <button type="submit" disabled={!paste.trim()}><Unlink size={17} /> Join</button>
      </form>
    </motion.section>
  );
}

/** Topbar chip: where you actually are. */
export function RoomChip() {
  const room = useFloor((s) => s.room);
  const users = useFloor((s) => s.users);
  if (!room) return null;
  return (
    <a className="room-chip" {...linkProps('/floor')} title={`Private room · ${room.name}`}>
      <Lock size={13} />
      <b>{room.name}</b>
      <span className="doto">{users.length}</span>
    </a>
  );
}

/**
 * A /room/<code> link is a landing, not a page: the key is in the #fragment and is
 * consumed at boot, so here we just report the result and get out of the URL.
 */
export function useRoomLink(route: { name: string; code?: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (route.name !== 'room' || done.current) return;
    done.current = true;
    const state = useFloor.getState();
    if (state.room) go('/floor', { replace: true });
    else {
      toast('That link is missing its room key, so it cannot open the room.', 'warn');
      go('/floor', { replace: true });
    }
  }, [route]);
}

export function RoomEmpty() {
  return (
    <div className="empty">
      <DotGlyph glyph="note" size={56} mode="build" />
      <p>Nobody in this room yet. Share the link and wait for them to land.</p>
    </div>
  );
}
