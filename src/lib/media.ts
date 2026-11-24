// Room-only attachments: emoji, GIFs and a photo taken on the spot. Nothing here
// is used on the public floor. The hard part is size — a Nostr event has to stay
// small enough for public relays, and in a room it is then encrypted and padded,
// so a snapshot is squeezed down to a thumbnail that survives the round trip.
import { toast } from './toast';

/** Kept short: a relay event with ~20 KB of binary inside it stays under ~28 KB of base64. */
const MAX_DATA_URL = 26_000;
const MAX_EDGE = 320;

export type Media = { k: 'img' | 'gif'; s: string; alt?: string };

const EMOJI_SETS: { label: string; cells: string[] }[] = [
  { label: 'Vibes', cells: ['🔥', '❤️', '🎶', '🎧', '🕺', '💃', '🪩', '🌙', '☕', '🌶️', '🥁', '🎸'] },
  { label: 'Desi', cells: ['🙏', '🪔', '🎊', '🍛', '🥭', '🐯', '🦚', '☂️', '💛', '🔔', '🪷', '🫶'] },
  { label: 'Reacts', cells: ['😂', '😮', '😍', '😭', '🤯', '👌', '🙌', '👀', '💀', '✨', '⚡', '🫠'] },
];

export const EMOJI = EMOJI_SETS;

/** A still from the camera or a picked file, shrunk until it fits an event. */
export async function toAttachment(file: Blob): Promise<Media | null> {
  const bitmap = await loadBitmap(file);
  if (!bitmap) { toast('Could not read that image.', 'warn'); return null; }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close?.(); return null; }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  for (const q of [0.62, 0.5, 0.4, 0.3, 0.22]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_DATA_URL) return { k: 'img', s: url, alt: `${w}×${h}` };
  }
  toast('That photo is too big to send here. Try a simpler one.', 'warn');
  return null;
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Safari has no createImageBitmap for every mime type; fall back to a decode.
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(c);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One-shot camera: a preview you can retake before it goes out. */
export async function snapCamera(video: HTMLVideoElement): Promise<Media | null> {
  const stream = video.srcObject as MediaStream | null;
  if (!stream || !video.videoWidth) { toast('Camera is not ready yet.', 'warn'); return null; }
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  for (const q of [0.6, 0.45, 0.32, 0.22]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_DATA_URL) return { k: 'img', s: url, alt: 'snapshot' };
  }
  return null;
}

export async function openCamera(video: HTMLVideoElement): Promise<(() => void) | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play().catch(() => {});
    return () => stream.getTracks().forEach((t) => t.stop());
  } catch {
    toast('No camera access — you can still attach a photo from files.', 'warn');
    return null;
  }
}

/**
 * GIFs need a provider. Without a key we accept a link; with VITE_GIPHY_KEY the
 * picker searches Giphy instead. Nothing is sent unless the room is open.
 */
export const GIPHY_ON = Boolean(import.meta.env.VITE_GIPHY_KEY);

export async function searchGifs(q: string, signal?: AbortSignal): Promise<Media[]> {
  if (!GIPHY_ON || !q.trim()) return [];
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${import.meta.env.VITE_GIPHY_KEY}&limit=12&rating=g&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { images?: { fixed_width?: { url?: string } } }[] };
    return (data.data ?? [])
      .map((g) => g.images?.fixed_width?.url)
      .filter((u): u is string => !!u && u.startsWith('https://'))
      .map((s) => ({ k: 'gif' as const, s }));
  } catch {
    return [];
  }
}

/** Anything that arrives over the wire is treated as untrusted input. */
export function safeMedia(m: unknown): Media | null {
  if (!m || typeof m !== 'object') return null;
  const { k, s, alt } = m as { k?: unknown; s?: unknown; alt?: unknown };
  if (k !== 'img' && k !== 'gif') return null;
  if (typeof s !== 'string' || s.length > MAX_DATA_URL + 400) return null;
  if (k === 'gif' ? !/^https:\/\/[^\s]+$/i.test(s) : !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/i.test(s)) return null;
  return { k, s, alt: typeof alt === 'string' ? alt.slice(0, 40) : undefined };
}
