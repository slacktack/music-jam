import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type AccentMode = 'music' | string; // 'music' = follow what's playing, else a fixed hex

export const ACCENTS: { id: AccentMode; label: string; colors: [string, string] }[] = [
  { id: 'music', label: 'Follow the music', colors: ['#FF8A00', '#FF2D95'] },
  { id: '#2F6BFF', label: 'Blue', colors: ['#2F6BFF', '#5B5BFF'] },
  { id: '#FF8A00', label: 'Saffron', colors: ['#FF8A00', '#E10600'] },
  { id: '#2BD94A', label: 'Phosphor', colors: ['#2BD94A', '#00E0B0'] },
  { id: '#E10600', label: 'Red', colors: ['#E10600', '#FF2D95'] },
  { id: '#9B5CFF', label: 'Violet', colors: ['#7C4DFF', '#C04CFD'] },
  { id: '#2F9A5A', label: 'Forest', colors: ['#2F9A5A', '#1E6B3E'] },
];

const read = <T extends string>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) || d; } catch { return d; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#EEF0F4' : '#050507');
}

export const useTheme = create<{ theme: Theme; accent: AccentMode; toggle: () => void; setAccent: (a: AccentMode) => void }>((set, get) => ({
  theme: read<Theme>('jam.theme', 'dark'),
  accent: read<AccentMode>('jam.accent', 'music'),
  toggle() {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    write('jam.theme', theme);
    apply(theme);
    set({ theme });
  },
  setAccent(accent) {
    write('jam.accent', accent);
    set({ accent });
  },
}));
apply(useTheme.getState().theme);
