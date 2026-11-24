// In-app sharing. navigator.share hands the user a system sheet they can't read
// properly on a phone, so JAM draws its own: the link, the destinations that work
// for anyone (no account needed), and the private room invite front and centre.
import { create } from 'zustand';
import type { Track } from './types';
import { toast } from './toast';

export interface ShareItem {
  title: string;
  subtitle?: string;
  art?: string;
  url: string;
  /** What the receiver is getting: a song, a station, a room. */
  kind: 'song' | 'radio' | 'room' | 'page';
}

interface ShareState {
  item: ShareItem | null;
  open: (item: ShareItem) => void;
  close: () => void;
}

export const useShare = create<ShareState>((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));

export function shareUrl(t: Track) {
  if (t.kind === 'radio') return `${location.origin}/r/${t.id}`;
  const qs = new URLSearchParams({ t: t.title, a: t.subtitle });
  return `${location.origin}/s/${t.url}?${qs}`;
}

export const shareTrack = (t: Track) =>
  useShare.getState().open({
    title: t.title,
    subtitle: t.subtitle,
    art: t.art,
    url: shareUrl(t),
    kind: t.kind,
  });

export const sharePage = (title: string, url = location.origin + location.pathname) =>
  useShare.getState().open({ title, url, kind: 'page' });

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied. Paste it anywhere.', 'info');
    return true;
  } catch {
    prompt('Copy this link', text);
    return false;
  }
}

/** Plain web destinations — anyone can open them, no JAM account involved. */
export function targets(item: ShareItem) {
  const url = encodeURIComponent(item.url);
  const text = encodeURIComponent(
    item.kind === 'room'
      ? `Join my private JAM room: ${item.title}`
      : item.kind === 'radio'
        ? `Tune in to ${item.title} live with me on JAM`
        : `Jam to ${item.title} with me on JAM`,
  );
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${url}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${url}&text=${text}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
    { id: 'mail', label: 'Email', href: `mailto:?subject=${text}&body=${text}%0D%0A${url}` },
    { id: 'sms', label: 'SMS', href: `sms:?body=${text}%20${url}` },
  ];
}
