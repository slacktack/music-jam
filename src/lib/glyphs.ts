// Dot-matrix glyphs (7x7). Used for reactions, empty states and the logo.
const B = (rows: string[]) => rows.map((r) => [...r].map((c) => c !== '.'));

export const GLYPHS = {
  heart: B(['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']),
  fire: B(['...X...', '..XX...', '..XXX.X', '.XXXXXX', 'XXX.XXX', 'XX...XX', '.XXXXX.']),
  bolt: B(['....XX.', '...XX..', '..XX...', '.XXXXX.', '...XX..', '..XX...', '.XX....']),
  star: B(['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', 'X.....X']),
  note: B(['...XXXX', '...X..X', '...X..X', '...X..X', '.XXX.XX', 'XXXXXXX', '.XX..XX']),
  wave: B(['.......', 'X.....X', 'XX...XX', '.XX.XX.', '..XXX..', '...X...', '.......']),
  play: B(['X......', 'XXX....', 'XXXXX..', 'XXXXXXX', 'XXXXX..', 'XXX....', 'X......']),
  sad: B(['.XXXXX.', 'X.....X', 'X.X.X.X', 'X.....X', 'X.XXX.X', 'XX...XX', '.XXXXX.']),
  search: B(['.XXX...', 'X...X..', 'X...X..', 'X...X..', '.XXX...', '....XX.', '.....XX']),
  radio: B(['......X', '....XX.', 'XXXXXXX', 'X.....X', 'X.XX..X', 'X.XX..X', 'XXXXXXX']),
} as const;

export type GlyphId = keyof typeof GLYPHS;
export const REACTIONS: { id: GlyphId; color: string; label: string }[] = [
  { id: 'fire', color: '#FF8A00', label: 'Fire' },
  { id: 'heart', color: '#E10600', label: 'Love' },
  { id: 'bolt', color: '#D7FF3A', label: 'Energy' },
  { id: 'star', color: '#FFC300', label: 'Star' },
  { id: 'note', color: '#2BD94A', label: 'Tune' },
  { id: 'wave', color: '#5B5BFF', label: 'Vibe' },
];
export const isReaction = (g: unknown): g is GlyphId => REACTIONS.some((r) => r.id === g);
