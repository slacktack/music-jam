// Private rooms: an unlisted, end-to-end encrypted space on top of the same relays
// the global floor uses. There is no account and no server, so the room *is* a key.
//
// The room secret is derived from this device's throwaway signing key, so the same
// person always lands on the same room code and the same share link — nothing to
// remember, nothing to store on our side. Anyone with the link holds the secret and
// can read and write; anyone without it sees only ciphertext on the relay.
import { getPublicKey } from 'nostr-tools/pure';
import { v2 as nip44 } from 'nostr-tools/nip44';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';

const SALT = 'jam-private-room-v1';
const KEY = 'jam.room';
const CODE_LEN = 12; // hex chars of the room public key used as the public label

export interface Room {
  code: string; // public label, also the relay namespace
  sk: string; // 64-char hex — the capability. Travels in the link, never in a path.
  pk: string;
  name: string;
}

const ADJ = ['Neon', 'Velvet', 'Midnight', 'Masala', 'Lunar', 'Turbo', 'Chai', 'Static'];
const NOUN = ['Tiger', 'Dhol', 'Sitar', 'Mango', 'Comet', 'Tabla', 'Cocktail', 'Baaz'];

/** Stable, friendly label for a room code. */
function nameFor(code: string) {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${ADJ[h % ADJ.length]}${NOUN[(h >>> 8) % NOUN.length]}`;
}

const isHex = (v: unknown, len = 64): v is string => typeof v === 'string' && new RegExp(`^[0-9a-f]{${len}}$`).test(v);

/** The room this device owns. Same key in, same room out — always. */
export function roomForSk(signingKeyHex: string): Room {
  const skBytes = sha256.create().update(hexToBytes(signingKeyHex)).update(utf8ToBytes(SALT)).digest();
  const pk = getPublicKey(skBytes);
  const code = pk.slice(0, CODE_LEN);
  return { code, sk: bytesToHex(skBytes), pk, name: nameFor(code) };
}

/** Encrypt with my key -> the room key; decrypt with the room key -> the sender's key. */
export function codecFor(room: Room, signingKeyHex: string) {
  const { getConversationKey } = nip44.utils;
  const roomSk = hexToBytes(room.sk);
  const sealKey = getConversationKey(hexToBytes(signingKeyHex), room.pk);
  return {
    seal(payload: unknown): string {
      return nip44.encrypt(JSON.stringify(payload), sealKey);
    },
    open(content: string, from: string): unknown | null {
      if (typeof content !== 'string' || content.length > 20_000 || !isHex(from)) return null;
      try {
        return JSON.parse(nip44.decrypt(content, getConversationKey(roomSk, from)));
      } catch {
        return null;
      }
    },
  };
}

export const namespace = (room: Room | null) => (room ? `jam-r-${room.code}` : '');

export function roomLink(room: Room) {
  return `${location.origin}/room/${room.code}#k=${room.sk}`;
}

/** Read a room out of a URL (path + #k= key) or a pasted link. */
export function roomFromLink(url: string): Room | null {
  try {
    const u = new URL(url, location.origin);
    const parts = u.pathname.split('/').filter(Boolean);
    const code = parts[parts.indexOf('room') + 1] ?? '';
    const sk = new URLSearchParams(u.hash.replace(/^#/, '')).get('k') ?? '';
    if (!isHex(sk)) return null;
    const pk = getPublicKey(hexToBytes(sk));
    const real = pk.slice(0, CODE_LEN);
    if (code && code.toLowerCase() !== real) return null; // link tampered with
    return { code: real, sk, pk, name: nameFor(real) };
  } catch {
    return null;
  }
}

export function storeRoom(room: Room | null) {
  try {
    if (room) localStorage.setItem(KEY, JSON.stringify({ code: room.code, sk: room.sk }));
    else localStorage.removeItem(KEY);
  } catch {}
}

/** Stored room wins; a fresh link second; otherwise the global floor. */
export function currentRoom(signingKeyHex: string): { room: Room | null; fromLink: boolean } {
  const fromUrl = roomFromLink(location.href);
  if (fromUrl) return { room: fromUrl, fromLink: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { room: null, fromLink: false };
    const parsed = JSON.parse(raw) as { code?: unknown; sk?: unknown };
    if (!isHex(parsed.sk) || typeof parsed.code !== 'string') return { room: null, fromLink: false };
    const pk = getPublicKey(hexToBytes(parsed.sk));
    const code = pk.slice(0, CODE_LEN);
    if (code !== parsed.code.toLowerCase()) return { room: null, fromLink: false };
    return { room: { code, sk: parsed.sk, pk, name: nameFor(code) }, fromLink: false };
  } catch {
    return { room: null, fromLink: false };
  }
}
