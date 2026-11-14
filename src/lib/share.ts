import type { Track } from './types';
import { toast } from './toast';

export function shareUrl(t: Track) {
  if (t.kind === 'radio') return `${location.origin}/r/${t.id}`;
  const qs = new URLSearchParams({ t: t.title, a: t.subtitle });
  return `${location.origin}/s/${t.url}?${qs}`;
}

export async function shareTrack(t: Track) {
  const url = shareUrl(t);
  const text = t.kind === 'radio' ? `Tune in to ${t.title} live with me on JAM` : `Jam to ${t.title} with me on JAM`;
  try {
    if (navigator.share) {
      await navigator.share({ title: t.title, text, url });
      return;
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied. Paste it anywhere.', 'info');
  } catch {
    prompt('Copy this link', url);
  }
}
