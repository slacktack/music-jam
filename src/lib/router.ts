// Path-based routes (History API). Every host serves index.html for unknown paths.
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string }
  | { name: 'vibe'; id: string }
  | { name: 'fest'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'floor' }
  | { name: 'chat' }
  | { name: 'likes' }
  | { name: 'stations'; tab: string }
  | { name: 'radio'; id: string }
  | { name: 'song'; id: string; title: string; by: string };

function parse(): Route {
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const qs = new URLSearchParams(location.search);
  const [a, b] = parts;
  switch (a) {
    case 'search': return { name: 'search', q: qs.get('q') || '' };
    case 'vibe': return b ? { name: 'vibe', id: b } : { name: 'home' };
    case 'fest': return b ? { name: 'fest', id: b } : { name: 'home' };
    case 'artist': return b ? { name: 'artist', id: b } : { name: 'home' };
    case 'floor': return { name: 'floor' };
    case 'chat': return { name: 'chat' };
    case 'likes': return { name: 'likes' };
    case 'radio': return { name: 'stations', tab: b || 'india' };
    case 'r': return b && /^[0-9a-f-]{36}$/i.test(b) ? { name: 'radio', id: b } : { name: 'home' };
    case 's': return b && /^[\w-]{11}$/.test(b) ? { name: 'song', id: b, title: qs.get('t') || '', by: qs.get('a') || '' } : { name: 'home' };
    default: return { name: 'home' };
  }
}

let current = parse();
const subs = new Set<() => void>();
const emit = () => {
  current = parse();
  subs.forEach((f) => f());
};
addEventListener('popstate', emit);

export const useRoute = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => current);

export function go(path: string, opts: { replace?: boolean } = {}) {
  const url = path.startsWith('/') ? path : `/${path}`;
  if (url === location.pathname + location.search) return;
  history[opts.replace ? 'replaceState' : 'pushState'](null, '', url);
  emit();
  if (!opts.replace) document.querySelector('.main')?.scrollTo({ top: 0 });
}

export function back() {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
  else go('/');
}

/** Click handler for <a href> so links work with middle-click and still route in-app. */
export function linkProps(path: string) {
  return {
    href: path,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      go(path);
    },
  };
}
