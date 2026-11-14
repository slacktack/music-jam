export const PALETTE = {
  indigo: '#5B5BFF',
  phosphor: '#2BD94A',
  red: '#E10600',
  amber: '#FFB300',
  cyan: '#00D1FF',
  magenta: '#FF2D95',
  violet: '#9B5CFF',
  orange: '#FF6A00',
} as const;

export const COLORS = Object.values(PALETTE);

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pair of colors for any seed (station id, user id...). */
export function colorsFor(seed: string): [string, string] {
  const h = hash(seed);
  const a = h % COLORS.length;
  const b = (a + 1 + ((h >>> 8) % (COLORS.length - 1))) % COLORS.length;
  return [COLORS[a], COLORS[b]];
}

/** Small seeded PRNG so generated art is stable per seed. */
export function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
