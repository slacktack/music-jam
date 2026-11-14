import { create } from 'zustand';
import type { Track } from './types';

const KEY = 'jam.likes.v2';
function read(): Track[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((t) => t && t.id && t.kind) : [];
  } catch {
    return [];
  }
}

export const useLikes = create<{ likes: Track[]; toggle: (t: Track) => void }>((set, get) => ({
  likes: read(),
  toggle(t) {
    const has = get().likes.some((l) => l.id === t.id);
    const likes = has ? get().likes.filter((l) => l.id !== t.id) : [t, ...get().likes];
    try { localStorage.setItem(KEY, JSON.stringify(likes)); } catch {}
    set({ likes });
  },
}));

export const useLiked = (id?: string) => useLikes((s) => !!id && s.likes.some((l) => l.id === id));
