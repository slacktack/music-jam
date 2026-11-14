// What the app offers: language/genre "vibes" (desi first) and festivals & moods.
// Each entry knows how to find radio stations (Radio Browser params) and songs (YouTube query).
import { PALETTE as P } from './color';

export type Pattern = 'waves' | 'zigzag' | 'rings' | 'rays' | 'contour' | 'grid';
export type Query = Record<string, string>;
const top = (q: Query): Query => ({ order: 'clickcount', reverse: 'true', ...q });
const Y = new Date().getFullYear();

export interface Vibe {
  id: string;
  label: string;
  sub: string;
  colors: [string, string];
  pattern: Pattern;
  radio: Query[];
  songs: string;
  desi?: boolean;
}

const lang = (id: string, label: string, sub: string, colors: [string, string], pattern: Pattern): Vibe => ({
  id, label, sub, colors, pattern, desi: true, radio: [top({ language: id }), top({ tag: id })], songs: `${label} hit songs ${Y}`,
});

export const VIBES: Vibe[] = [
  { id: 'hindi', label: 'Hindi', sub: 'हिंदी · the new hits', colors: [P.saffron, P.red], pattern: 'waves', desi: true, radio: [top({ language: 'hindi' }), top({ tag: 'hindi' })], songs: `new hindi songs ${Y}` },
  { id: 'punjabi', label: 'Punjabi', sub: 'ਪੰਜਾਬੀ · Diljit to Shubh', colors: [P.phosphor, P.lime], pattern: 'zigzag', desi: true, radio: [top({ language: 'punjabi' }), top({ tag: 'punjabi' }), top({ name: 'punjabi' })], songs: `new punjabi songs ${Y}` },
  {
    id: 'retro-hindi', label: 'Retro Hindi', sub: 'Kishore · Lata · Rafi · RD', colors: [P.marigold, P.magenta], pattern: 'rings', desi: true,
    radio: [
      top({ countrycode: 'IN', name: 'retro' }), top({ language: 'hindi', name: '90' }), top({ language: 'hindi', name: 'gold' }),
      top({ language: 'hindi', tag: 'retro' }), top({ name: 'kishore' }), top({ countrycode: 'IN', name: 'rafi' }),
      top({ countrycode: 'IN', name: 'lata' }), top({ language: 'hindi', tag: '90s' }), top({ name: 'vividh' }), top({ tag: 'bollywood', name: 'nostalgi' }),
    ],
    songs: 'kishore kumar hit songs||lata mangeshkar hit songs||mohammed rafi hit songs||r d burman songs||asha bhosle hit songs',
  },
  { id: 'bollywood', label: 'Bollywood', sub: 'Filmi, all day', colors: [P.magenta, P.violet], pattern: 'contour', desi: true, radio: [top({ tag: 'bollywood' })], songs: `bollywood hit songs ${Y}` },
  { id: 'bhakti', label: 'Bhakti', sub: 'Bhajan · aarti · kirtan', colors: [P.marigold, P.saffron], pattern: 'rays', desi: true, radio: [top({ tag: 'bhajan' }), top({ tag: 'devotional', countrycode: 'IN' }), top({ name: 'bhakti' })], songs: 'bhakti songs bhajan' },
  { id: 'bhojpuri', label: 'Bhojpuri', sub: 'Purvanchal bangers', colors: [P.saffron, P.magenta], pattern: 'zigzag', desi: true, radio: [top({ language: 'bhojpuri' }), top({ name: 'bhojpuri' }), top({ tag: 'bhojpuri' })], songs: `bhojpuri songs ${Y}` },
  { id: 'sufi', label: 'Sufi & Ghazal', sub: 'Qawwali, ghazal, sufi', colors: [P.teal, P.indigo], pattern: 'waves', desi: true, radio: [top({ tag: 'ghazal' }), top({ tag: 'sufi' }), top({ tag: 'qawwali' })], songs: 'sufi songs ghazal qawwali' },
  { id: 'desi-hiphop', label: 'Desi Hip-hop', sub: 'Gully to the charts', colors: [P.red, P.indigo], pattern: 'grid', desi: true, radio: [top({ tag: 'desi' }), top({ countrycode: 'IN', tag: 'hip hop' })], songs: `desi hip hop songs ${Y}` },
  { id: 'hindi-lofi', label: 'Hindi Lo-fi', sub: 'Slowed + reverb', colors: [P.violet, P.cyan], pattern: 'contour', desi: true, radio: [top({ tag: 'lofi', countrycode: 'IN' }), top({ name: 'lofi', language: 'hindi' }), top({ tag: 'lofi' })], songs: 'hindi lofi songs slowed reverb' },
  { id: 'haryanvi', label: 'Haryanvi', sub: 'Desi thumka', colors: [P.lime, P.saffron], pattern: 'grid', desi: true, radio: [top({ language: 'haryanvi' }), top({ name: 'haryanvi' })], songs: `haryanvi songs ${Y}` },
  lang('tamil', 'Tamil', 'தமிழ் · Anirudh & co', [P.red, P.marigold], 'rays'),
  lang('telugu', 'Telugu', 'తెలుగు · Tollywood', [P.cyan, P.magenta], 'zigzag'),
  lang('malayalam', 'Malayalam', 'മലയാളം', [P.phosphor, P.teal], 'waves'),
  lang('kannada', 'Kannada', 'ಕನ್ನಡ', [P.marigold, P.red], 'rings'),
  lang('marathi', 'Marathi', 'मराठी', [P.saffron, P.violet], 'contour'),
  lang('bengali', 'Bengali', 'বাংলা', [P.red, P.teal], 'waves'),
  lang('gujarati', 'Gujarati', 'ગુજરાતી · garba ready', [P.magenta, P.marigold], 'rings'),
  { id: 'english', label: 'English Hits', sub: 'Top 40 worldwide', colors: [P.indigo, P.magenta], pattern: 'waves', radio: [top({ language: 'english', tag: 'hits' }), top({ language: 'english', tag: 'pop' }), top({ language: 'english', tag: 'top 40' })], songs: `top english songs ${Y}` },
  { id: 'hiphop', label: 'Hip-hop', sub: 'Rap & R&B', colors: [P.red, P.marigold], pattern: 'grid', radio: [top({ tag: 'hip hop' }), top({ tag: 'hiphop' }), top({ tag: 'rap' })], songs: `hip hop songs ${Y}` },
  { id: 'lofi', label: 'Lo-fi', sub: 'Beats to study to', colors: [P.violet, P.indigo], pattern: 'contour', radio: [top({ tag: 'lofi' }), top({ tag: 'lo-fi' }), top({ tag: 'chillhop' })], songs: 'lofi hip hop' },
  { id: 'electronic', label: 'Electronic', sub: 'EDM & more', colors: [P.cyan, P.indigo], pattern: 'zigzag', radio: [top({ tag: 'electronic' })], songs: `edm songs ${Y}` },
  { id: 'house', label: 'House', sub: 'Four on the floor', colors: [P.indigo, P.phosphor], pattern: 'grid', radio: [top({ tag: 'house' })], songs: 'house music mix' },
  { id: 'techno', label: 'Techno', sub: 'Warehouse hours', colors: [P.phosphor, P.cyan], pattern: 'zigzag', radio: [top({ tag: 'techno' })], songs: 'techno' },
  { id: 'rock', label: 'Rock', sub: 'Guitars up', colors: [P.red, P.violet], pattern: 'rays', radio: [top({ tag: 'rock' })], songs: 'rock songs' },
  { id: 'jazz', label: 'Jazz', sub: 'Smoke & brass', colors: [P.marigold, P.indigo], pattern: 'waves', radio: [top({ tag: 'jazz' })], songs: 'jazz classics' },
  { id: 'chill', label: 'Chill', sub: 'Ambient & downtempo', colors: [P.teal, P.violet], pattern: 'contour', radio: [top({ tag: 'chillout' }), top({ tag: 'ambient' })], songs: 'chill songs' },
  { id: 'kpop', label: 'K-pop', sub: 'Seoul to you', colors: [P.magenta, P.cyan], pattern: 'rings', radio: [top({ tag: 'kpop' }), top({ tag: 'k-pop' })], songs: `kpop songs ${Y}` },
  { id: 'latin', label: 'Latin', sub: 'Reggaeton & more', colors: [P.saffron, P.magenta], pattern: 'zigzag', radio: [top({ tag: 'latin' }), top({ tag: 'reggaeton' })], songs: `reggaeton hits ${Y}` },
  { id: '90s', label: '90s', sub: 'Throwbacks', colors: [P.magenta, P.marigold], pattern: 'grid', radio: [top({ tag: '90s' })], songs: '90s hits' },
  { id: 'classical', label: 'Classical', sub: 'Strings & keys', colors: [P.indigo, P.marigold], pattern: 'rings', radio: [top({ tag: 'classical' })], songs: 'classical music' },
  { id: 'metal', label: 'Metal', sub: 'Heavy', colors: [P.red, P.phosphor], pattern: 'rays', radio: [top({ tag: 'metal' })], songs: 'metal songs' },
];

export interface Festival {
  id: string;
  label: string;
  sub: string;
  /** Main day per year (approximate for lunar festivals). Empty = mood, always on. */
  dates: string[];
  before: number; // days before the main day it counts as "now"
  after: number; // days after
  colors: [string, string];
  pattern: Pattern;
  songs: string;
  radio: Query[];
  aliases: string[];
}

const fest = (f: Omit<Festival, 'before' | 'after'> & Partial<Pick<Festival, 'before' | 'after'>>): Festival => ({ before: 3, after: 1, ...f });

export const FESTIVALS: Festival[] = [
  fest({ id: 'chhath', label: 'Chhath Puja', sub: 'Sharda Sinha, the ghat, the setting sun', dates: ['2026-11-15', '2027-11-04'], before: 4, colors: [P.saffron, P.red], pattern: 'rays', songs: 'chhath puja songs sharda sinha', radio: [top({ language: 'bhojpuri' }), top({ name: 'bhojpuri' })], aliases: ['chhath', 'chath', 'chhat', 'chhathi maiya', 'chhath puja'] }),
  fest({ id: 'diwali', label: 'Diwali', sub: 'Diyas, rangoli, Lakshmi aarti', dates: ['2026-11-08', '2027-10-29'], before: 5, after: 2, colors: [P.marigold, P.magenta], pattern: 'grid', songs: 'diwali songs hindi', radio: [top({ tag: 'bhajan' })], aliases: ['diwali', 'deepawali', 'divali', 'dipawali'] }),
  fest({ id: 'gurpurab', label: 'Gurpurab', sub: 'Shabad kirtan, Waheguru', dates: ['2026-11-24', '2027-11-14'], before: 2, colors: [P.marigold, P.indigo], pattern: 'rings', songs: 'gurbani shabad kirtan', radio: [top({ name: 'gurbani' }), top({ tag: 'gurbani' }), top({ tag: 'kirtan' })], aliases: ['gurpurab', 'guru nanak jayanti', 'gurbani', 'kirtan', 'shabad'] }),
  fest({ id: 'shaadi', label: 'Shaadi Season', sub: 'Sangeet, baraat, mehendi', dates: ['2026-11-20', '2027-11-20'], before: 6, after: 85, colors: [P.magenta, P.saffron], pattern: 'contour', songs: 'shaadi songs wedding dance bollywood', radio: [top({ tag: 'bollywood' })], aliases: ['shaadi', 'shadi', 'wedding', 'sangeet', 'baraat', 'mehendi', 'mehndi'] }),
  fest({ id: 'christmas', label: 'Christmas', sub: 'Jingle all the way', dates: ['2026-12-25', '2027-12-25'], before: 10, colors: [P.red, P.phosphor], pattern: 'grid', songs: 'christmas songs', radio: [top({ tag: 'christmas' })], aliases: ['christmas', 'xmas', 'carol'] }),
  fest({ id: 'newyear', label: 'New Year Party', sub: 'Countdown bangers', dates: ['2026-12-31', '2027-12-31'], colors: [P.indigo, P.magenta], pattern: 'rays', songs: 'new year party songs bollywood', radio: [top({ tag: 'party' })], aliases: ['new year', 'nye', 'party'] }),
  fest({ id: 'lohri', label: 'Lohri', sub: 'Bonfire, rewri, bhangra', dates: ['2026-01-13', '2027-01-13'], colors: [P.saffron, P.marigold], pattern: 'rays', songs: 'lohri songs punjabi', radio: [top({ language: 'punjabi' })], aliases: ['lohri', 'lohdi'] }),
  fest({ id: 'sankranti', label: 'Sankranti & Pongal', sub: 'Kites up', dates: ['2026-01-14', '2027-01-14'], colors: [P.marigold, P.cyan], pattern: 'zigzag', songs: 'makar sankranti songs pongal songs', radio: [top({ language: 'tamil' })], aliases: ['sankranti', 'pongal', 'uttarayan', 'kite'] }),
  fest({ id: 'holi', label: 'Holi', sub: 'Rang barse', dates: ['2026-03-04', '2027-03-22'], before: 5, colors: [P.magenta, P.phosphor], pattern: 'contour', songs: 'holi songs bollywood', radio: [top({ tag: 'bollywood' })], aliases: ['holi', 'rang'] }),
  fest({ id: 'eid', label: 'Eid', sub: 'Chand raat to qawwali', dates: ['2026-03-20', '2027-03-10'], after: 2, colors: [P.phosphor, P.cyan], pattern: 'rings', songs: 'eid mubarak songs qawwali', radio: [top({ tag: 'qawwali' })], aliases: ['eid', 'ramzan', 'ramadan', 'chand raat'] }),
  fest({ id: 'baisakhi', label: 'Baisakhi', sub: 'Harvest bhangra', dates: ['2026-04-14', '2027-04-14'], colors: [P.lime, P.saffron], pattern: 'zigzag', songs: 'baisakhi bhangra songs', radio: [top({ language: 'punjabi' })], aliases: ['baisakhi', 'vaisakhi'] }),
  fest({ id: 'rakhi', label: 'Raksha Bandhan', sub: 'For the siblings', dates: ['2026-08-28', '2027-08-17'], colors: [P.magenta, P.marigold], pattern: 'waves', songs: 'raksha bandhan songs', radio: [top({ tag: 'bollywood' })], aliases: ['rakhi', 'raksha bandhan'] }),
  fest({ id: 'janmashtami', label: 'Janmashtami', sub: 'Krishna bhajans, dahi handi', dates: ['2026-09-04', '2027-08-25'], colors: [P.indigo, P.cyan], pattern: 'waves', songs: 'krishna bhajan janmashtami songs', radio: [top({ tag: 'bhajan' })], aliases: ['janmashtami', 'krishna', 'dahi handi'] }),
  fest({ id: 'ganesh', label: 'Ganesh Chaturthi', sub: 'Ganpati bappa morya', dates: ['2026-09-14', '2027-09-04'], before: 2, after: 10, colors: [P.saffron, P.red], pattern: 'rings', songs: 'ganpati songs ganesh chaturthi', radio: [top({ language: 'marathi' })], aliases: ['ganesh', 'ganpati', 'ganeshotsav', 'ganesh chaturthi'] }),
  fest({ id: 'navratri', label: 'Navratri & Garba', sub: 'Dandiya nights', dates: ['2026-10-11', '2027-09-30'], before: 1, after: 9, colors: [P.red, P.marigold], pattern: 'rings', songs: 'navratri garba songs', radio: [top({ language: 'gujarati' })], aliases: ['navratri', 'garba', 'dandiya', 'dussehra'] }),
  fest({ id: 'durga', label: 'Durga Puja', sub: 'Dhak, pandals, pujo', dates: ['2026-10-17', '2027-10-06'], before: 1, after: 4, colors: [P.red, P.saffron], pattern: 'rays', songs: 'durga puja songs dhak', radio: [top({ language: 'bengali' })], aliases: ['durga', 'pujo', 'durga puja'] }),
  fest({ id: 'karva', label: 'Karva Chauth', sub: 'Waiting for the moon', dates: ['2026-10-29', '2027-10-18'], before: 2, after: 0, colors: [P.red, P.magenta], pattern: 'rings', songs: 'karva chauth songs', radio: [top({ tag: 'bollywood' })], aliases: ['karva chauth', 'karwa chauth', 'karva'] }),
  // Moods: always on.
  fest({ id: 'gym', label: 'Gym Mode', sub: 'Desi pump-up, no skips', dates: [], colors: [P.red, P.lime], pattern: 'zigzag', songs: 'gym workout songs hindi punjabi', radio: [top({ tag: 'workout' }), top({ tag: 'fitness' })], aliases: ['gym', 'workout', 'running', 'fitness'] }),
  fest({ id: 'barish', label: 'Barish', sub: 'Monsoon & chai', dates: [], colors: [P.cyan, P.indigo], pattern: 'waves', songs: 'barish songs hindi monsoon', radio: [top({ tag: 'romantic', language: 'hindi' })], aliases: ['barish', 'baarish', 'rain', 'monsoon'] }),
  fest({ id: 'roadtrip', label: 'Road Trip', sub: 'Windows down', dates: [], colors: [P.marigold, P.teal], pattern: 'contour', songs: 'road trip songs bollywood', radio: [top({ tag: 'hits', language: 'hindi' })], aliases: ['road trip', 'drive', 'travel'] }),
  fest({ id: 'latenight', label: 'Late Night', sub: '2am feelings', dates: [], colors: [P.violet, P.indigo], pattern: 'contour', songs: 'late night hindi songs sad', radio: [top({ tag: 'lofi' })], aliases: ['late night', 'sad', 'night'] }),
];

export type FestState = { state: 'now' | 'soon' | 'later' | 'mood'; days: number };

const DAY = 86400000;
export function festState(f: Festival, now = new Date()): FestState {
  if (!f.dates.length) return { state: 'mood', days: 0 };
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let best = Infinity;
  for (const d of f.dates) {
    const diff = Math.round((Date.parse(d) - today) / DAY);
    if (diff <= f.before && diff >= -f.after) return { state: 'now', days: 0 };
    if (diff > 0 && diff < best) best = diff;
  }
  if (best === Infinity) return { state: 'later', days: 9999 };
  return { state: best - f.before <= 30 ? 'soon' : 'later', days: best - f.before };
}

/** Festivals happening now first, then the next ones, then moods, then the rest. */
export function sortedFestivals(now = new Date()) {
  const rank = { now: 0, soon: 1, mood: 2, later: 3 };
  return FESTIVALS.map((f) => ({ f, s: festState(f, now) })).sort((a, b) => rank[a.s.state] - rank[b.s.state] || a.s.days - b.s.days);
}

export function findFestival(q: string): Festival | undefined {
  const t = q.toLowerCase().trim();
  if (t.length < 3) return;
  return FESTIVALS.find((f) => f.aliases.some((a) => a.startsWith(t) || t.includes(a)));
}

export function findVibe(q: string): Vibe | undefined {
  const t = q.toLowerCase().trim();
  if (t.length < 3) return;
  return VIBES.find((v) => v.label.toLowerCase().startsWith(t) || v.id.startsWith(t));
}

export const vibeById = (id: string) => VIBES.find((v) => v.id === id);
export const festById = (id: string) => FESTIVALS.find((f) => f.id === id);

// Singers. `station` = they have dedicated stations in the radio directory (checked Nov 2026).
const nineties = [top({ language: 'hindi', name: '90' }), top({ tag: 'bollywood', name: '90' })];
const classic = [top({ countrycode: 'IN', name: 'retro' }), top({ language: 'hindi', name: 'gold' })];
const now = [top({ language: 'hindi' }), top({ tag: 'bollywood' })];
const punjab = [top({ language: 'punjabi' })];
const artist = (id: string, label: string, sub: string, colors: [string, string], pattern: Pattern, station: string | null, fallback: Query[]): Vibe => ({
  id, label, sub, colors, pattern, desi: true,
  radio: [...(station ? [top({ countrycode: 'IN', name: station })] : []), ...fallback],
  songs: `${label} hit songs`,
});

export const ARTISTS: Vibe[] = [
  artist('kishore-kumar', 'Kishore Kumar', 'Yodel-ay-ee-oo', [P.marigold, P.red], 'rings', 'kishore', classic),
  artist('lata-mangeshkar', 'Lata Mangeshkar', 'Nightingale of India', [P.magenta, P.marigold], 'waves', 'lata', classic),
  artist('mohammed-rafi', 'Mohammed Rafi', 'Gold-era magic', [P.cyan, P.indigo], 'contour', 'rafi', classic),
  artist('asha-bhosle', 'Asha Bhosle', 'Cabaret to ghazal', [P.red, P.magenta], 'zigzag', null, classic),
  artist('mukesh', 'Mukesh', 'Soulful classics', [P.teal, P.indigo], 'waves', 'mukesh', classic),
  artist('rd-burman', 'R.D. Burman', 'Pancham da', [P.saffron, P.violet], 'grid', null, classic),
  artist('kumar-sanu', 'Kumar Sanu', '90s king of romance', [P.saffron, P.magenta], 'rings', 'kumar sanu', nineties),
  artist('udit-narayan', 'Udit Narayan', 'Papa kehte hain', [P.marigold, P.phosphor], 'waves', null, nineties),
  artist('alka-yagnik', 'Alka Yagnik', 'Queen of the 90s', [P.magenta, P.violet], 'contour', 'alka yagnik', nineties),
  artist('abhijeet', 'Abhijeet', "SRK's 90s voice", [P.indigo, P.saffron], 'zigzag', null, nineties),
  artist('sonu-nigam', 'Sonu Nigam', 'Range for days', [P.cyan, P.magenta], 'rays', 'sonu nigam', nineties),
  artist('kk', 'KK', 'Pal, yaaron', [P.red, P.indigo], 'waves', null, nineties),
  artist('shaan', 'Shaan', 'Chand sifarish', [P.lime, P.cyan], 'grid', null, nineties),
  artist('lucky-ali', 'Lucky Ali', 'O sanam', [P.teal, P.marigold], 'contour', null, nineties),
  artist('sunidhi-chauhan', 'Sunidhi Chauhan', 'Dance-floor queen', [P.red, P.marigold], 'zigzag', null, now),
  artist('shreya-ghoshal', 'Shreya Ghoshal', 'Melody queen', [P.violet, P.magenta], 'waves', 'shreya', now),
  artist('arijit-singh', 'Arijit Singh', 'Heartbreak HQ', [P.indigo, P.violet], 'contour', 'arijit', now),
  artist('atif-aslam', 'Atif Aslam', 'Tere bin', [P.phosphor, P.teal], 'rings', null, now),
  artist('ar-rahman', 'A.R. Rahman', 'Mozart of Madras', [P.saffron, P.cyan], 'rays', null, now),
  artist('jagjit-singh', 'Jagjit Singh', 'Ghazal maestro', [P.teal, P.indigo], 'waves', null, [top({ tag: 'ghazal' })]),
  artist('nusrat', 'Nusrat Fateh Ali Khan', 'Qawwali legend', [P.marigold, P.teal], 'rays', null, [top({ tag: 'qawwali' }), top({ tag: 'sufi' })]),
  artist('diljit', 'Diljit Dosanjh', 'Born to shine', [P.phosphor, P.marigold], 'zigzag', null, punjab),
  artist('sidhu', 'Sidhu Moose Wala', 'Legend', [P.red, P.saffron], 'grid', null, punjab),
  artist('karan-aujla', 'Karan Aujla', 'Geetan di machine', [P.lime, P.red], 'zigzag', null, punjab),
  artist('ap-dhillon', 'AP Dhillon', 'Brown munde', [P.indigo, P.cyan], 'contour', null, punjab),
];

export const artistById = (id: string) => ARTISTS.find((a) => a.id === id);
export function findArtist(q: string) {
  const t = q.toLowerCase().trim();
  if (t.length < 3) return;
  return ARTISTS.find((a) => a.label.toLowerCase().includes(t) || t.includes(a.label.toLowerCase()));
}

// The Radio hub: live FM & internet stations, keeps playing with the screen off.
export const RADIO_TABS: { id: string; label: string; radio: Query[] }[] = [
  { id: 'india', label: 'Top India', radio: [top({ countrycode: 'IN' })] },
  { id: 'fm', label: 'FM channels', radio: [top({ countrycode: 'IN', name: 'mirchi' }), top({ countrycode: 'IN', name: 'big' }), top({ countrycode: 'IN', name: 'vividh' }), top({ countrycode: 'IN', name: 'air ' }), top({ name: 'red fm' }), top({ countrycode: 'IN', name: 'radio city' }), top({ countrycode: 'IN', name: 'fever' }), top({ countrycode: 'IN', name: ' fm' })] },
  { id: 'hindi', label: 'Hindi', radio: VIBES[0].radio },
  { id: 'punjabi', label: 'Punjabi', radio: VIBES[1].radio },
  { id: 'retro', label: 'Retro', radio: VIBES[2].radio },
  { id: 'bollywood', label: 'Bollywood', radio: VIBES[3].radio },
  { id: 'bhakti', label: 'Bhakti', radio: VIBES[4].radio },
  { id: 'bhojpuri', label: 'Bhojpuri', radio: VIBES[5].radio },
  { id: 'sufi', label: 'Sufi', radio: VIBES[6].radio },
  { id: 'south', label: 'South', radio: [top({ language: 'tamil' }), top({ language: 'telugu' }), top({ language: 'malayalam' }), top({ language: 'kannada' })] },
  { id: 'world', label: 'World', radio: [top({})] },
];
