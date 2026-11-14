// The floor: one global space everyone lands in. No rooms.
import { create } from 'zustand';
import type { ChatMsg, FloorStation, FloorUser, Station } from './types';
import { COLORS } from './color';
import { isLive, usePlayer } from './player';

const ADJ = ['Neon', 'Velvet', 'Static', 'Lunar', 'Turbo', 'Hazy', 'Cosmic', 'Chrome', 'Electric', 'Midnight', 'Solar', 'Fuzzy', 'Wavy', 'Desi', 'Lofi', 'Analog'];
const NOUN = ['Fox', 'Tiger', 'Otter', 'Comet', 'Raven', 'Panda', 'Moth', 'Koel', 'Lynx', 'Yeti', 'Gecko', 'Falcon', 'Mango', 'Phantom', 'Dhol', 'Synth'];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

interface Identity {
  name: string;
  color: string;
}
function loadIdentity(): Identity {
  try {
    const v = JSON.parse(localStorage.getItem('jam.me') || 'null');
    if (v?.name && v?.color) return v;
  } catch {}
  const me = { name: `${pick(ADJ)}${pick(NOUN)}${Math.floor(Math.random() * 90 + 10)}`, color: pick(COLORS) };
  localStorage.setItem('jam.me', JSON.stringify(me));
  return me;
}

export interface Reaction {
  key: number;
  emoji: string;
  x: number;
  color: string;
}

interface FloorState {
  connected: boolean;
  myId: string | null;
  me: Identity;
  total: number;
  users: FloorUser[];
  stations: FloorStation[];
  messages: ChatMsg[];
  reactions: Reaction[];
  unread: number;
  setIdentity: (patch: Partial<Identity>) => void;
  sendChat: (text: string) => void;
  react: (emoji: string) => void;
  clearUnread: () => void;
}

let ws: WebSocket | null = null;
let retry = 0;
let reactionKey = 0;
const send = (obj: unknown) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(obj));

function currentStation(): Station | null {
  const { station, status } = usePlayer.getState();
  return station && isLive(status) ? station : null;
}

export const useFloor = create<FloorState>((set, get) => ({
  connected: false,
  myId: null,
  me: loadIdentity(),
  total: 0,
  users: [],
  stations: [],
  messages: [],
  reactions: [],
  unread: 0,
  setIdentity(patch) {
    const me = { ...get().me, ...patch };
    localStorage.setItem('jam.me', JSON.stringify(me));
    set({ me });
    send({ type: 'hello', ...me, station: currentStation() });
  },
  sendChat(text) {
    send({ type: 'chat', text });
  },
  react(emoji) {
    send({ type: 'react', emoji });
    if (!get().connected) addReaction(emoji, get().me.color); // still feels alive solo
  },
  clearUnread: () => set({ unread: 0 }),
}));

function addReaction(emoji: string, color: string) {
  const r: Reaction = { key: ++reactionKey, emoji, x: 8 + Math.random() * 84, color };
  useFloor.setState((s) => ({ reactions: [...s.reactions.slice(-40), r] }));
  setTimeout(() => useFloor.setState((s) => ({ reactions: s.reactions.filter((x) => x.key !== r.key) })), 3200);
}

function connect() {
  const base = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  ws = new WebSocket(base);
  ws.onopen = () => {
    retry = 0;
    send({ type: 'hello', ...useFloor.getState().me, station: currentStation() });
  };
  ws.onmessage = (ev) => {
    let m: any;
    try {
      m = JSON.parse(ev.data);
    } catch {
      return;
    }
    switch (m.type) {
      case 'welcome':
        useFloor.setState({ connected: true, myId: m.id, messages: m.history || [] });
        break;
      case 'presence':
        useFloor.setState({ total: m.total, users: m.users, stations: m.stations });
        break;
      case 'chat':
        useFloor.setState((s) => ({
          messages: [...s.messages.slice(-119), m],
          unread: m.user.id === s.myId ? s.unread : s.unread + 1,
        }));
        break;
      case 'react':
        addReaction(m.emoji, m.user.color);
        break;
    }
  };
  ws.onclose = () => {
    useFloor.setState({ connected: false });
    setTimeout(connect, Math.min(15000, 1000 * 2 ** retry++));
  };
  ws.onerror = () => ws?.close();
}

let lastSent: string | null | undefined;
export function startFloor() {
  connect();
  usePlayer.subscribe(() => {
    const s = currentStation();
    const id = s?.id ?? null;
    if (id === lastSent) return;
    lastSent = id;
    send({ type: 'tune', station: s });
  });
}
