export const PALETTE = {
  saffron: '#FF8A00',
  marigold: '#FFC300',
  red: '#E10600',
  phosphor: '#2BD94A',
  lime: '#D7FF3A',
  indigo: '#5B5BFF',
  violet: '#9B5CFF',
  magenta: '#FF2D95',
  cyan: '#00D1FF',
  teal: '#00E0B0',
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

/** Hand-picked pairs that always look good together. */
const PAIRS: [string, string][] = [
  [PALETTE.saffron, PALETTE.red],
  [PALETTE.marigold, PALETTE.magenta],
  [PALETTE.phosphor, PALETTE.lime],
  [PALETTE.indigo, PALETTE.cyan],
  [PALETTE.magenta, PALETTE.violet],
  [PALETTE.red, PALETTE.indigo],
  [PALETTE.cyan, PALETTE.phosphor],
  [PALETTE.violet, PALETTE.saffron],
  [PALETTE.teal, PALETTE.indigo],
  [PALETTE.lime, PALETTE.saffron],
];

export function colorsFor(seed: string): [string, string] {
  return PAIRS[hash(seed) % PAIRS.length];
}

export function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
