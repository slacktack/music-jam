import { create } from 'zustand';

interface ToastState {
  items: { id: number; text: string }[];
}
export const useToasts = create<ToastState>(() => ({ items: [] }));

let n = 0;
export function toast(text: string) {
  const id = ++n;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4200);
}
