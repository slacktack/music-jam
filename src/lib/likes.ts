import { create } from 'zustand';
import type { Station } from './types';

const KEY = 'jam.likes';
function read(): Station[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const useLikes = create<{ likes: Station[]; toggle: (s: Station) => void }>((set, get) => ({
  likes: read(),
  toggle(s) {
    const has = get().likes.some((l) => l.id === s.id);
    const likes = has ? get().likes.filter((l) => l.id !== s.id) : [s, ...get().likes];
    localStorage.setItem(KEY, JSON.stringify(likes));
    set({ likes });
  },
}));
