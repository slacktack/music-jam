import { create } from 'zustand';

interface ToastState { items: { id: number; text: string; tone: 'info' | 'warn' }[] }
export const useToasts = create<ToastState>(() => ({ items: [] }));

let n = 0;
export function toast(text: string, tone: 'info' | 'warn' = 'warn') {
  const id = ++n;
  useToasts.setState((s) => ({ items: [...s.items.filter((t) => t.text !== text).slice(-1), { id, text, tone }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4800);
}
