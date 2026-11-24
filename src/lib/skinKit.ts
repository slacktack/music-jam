import {
  Activity, Anchor, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Asterisk, Bookmark, ChevronsLeft, ChevronsRight, Clapperboard, CornerDownLeft,
  Dices, Earth, FastForward, Feather, Film, Fish, Frame, Gauge, Hash, Heart, House, LayoutDashboard, ListOrdered, MessageCircle,
  MessageSquare, MessagesSquare, MonitorPlay, MousePointer2, Newspaper, Orbit, Pause, Play, Radio, RadioReceiver, RadioTower, Rewind, Rocket,
  Satellite, ScanSearch, Search, Send, SendHorizontal, Share, Share2, Shuffle, SkipBack, SkipForward, Sparkles, Square, Star, StepBack,
  StepForward, Sun, Telescope, Terminal, Tv, Users, Waves, Zap, type LucideIcon,
} from 'lucide-react';
import { useSkin, type SkinId } from './skins';

type Slot = 'home' | 'stations' | 'tube' | 'search' | 'floor' | 'likes' | 'chat' | 'prev' | 'next' | 'play' | 'pause' | 'share' | 'shuffle' | 'send';
type Words = Record<'home' | 'stations' | 'tube' | 'search' | 'floor' | 'likes' | 'chat' | 'inOrder' | 'shuffled' | 'upNext' | 'light' | 'dark' | 'chatTitle' | 'message', string>;
export interface Kit { icons: Record<Slot, LucideIcon>; words: Words }

const JAM: Kit = {
  icons: { home: House, stations: Radio, tube: MonitorPlay, search: Search, floor: Users, likes: Heart, chat: MessageCircle, prev: SkipBack, next: SkipForward, play: Play, pause: Pause, share: Share2, shuffle: Shuffle, send: ArrowUp },
  words: { home: 'Home', stations: 'Radio', tube: 'Tube', search: 'Search', floor: 'Floor', likes: 'Likes', chat: 'Chat', inOrder: 'In order', shuffled: 'Shuffled', upNext: 'Up next', light: 'Light mode', dark: 'Dark mode', chatTitle: '', message: '' },
};

const kit = (icons: Partial<Kit['icons']>, words: Partial<Words>): Kit => ({ icons: { ...JAM.icons, ...icons }, words: { ...JAM.words, ...words } });

export const KITS: Record<SkinId, Kit> = {
  jam: JAM,
  crimson: kit(
    { home: Newspaper, stations: RadioTower, tube: Tv, floor: Users, likes: Heart, chat: MessageSquare, prev: ArrowLeft, next: ArrowRight, share: ArrowUpRight, send: ArrowRight },
    { home: 'Front page', stations: 'Radio', tube: 'Tube', floor: 'Floor', likes: 'Likes', inOrder: 'In order', shuffled: 'Thrown', upNext: 'Next up', light: 'Bone', dark: 'Ink', message: 'Say it loud' },
  ),
  aurora: kit(
    { home: Sparkles, stations: Radio, tube: Clapperboard, search: Telescope, floor: Users, likes: Star, chat: Feather, prev: ChevronsLeft, next: ChevronsRight, share: Share, send: Feather },
    { home: 'Gallery', stations: 'Radio', tube: 'Cinema', search: 'Seek', floor: 'Salon', likes: 'Collection', chat: 'Salon', inOrder: 'Sequence', shuffled: 'Drift', upNext: 'Next exhibit', light: 'Daylight', dark: 'Gallery night', chatTitle: 'The salon', message: 'Leave a note in the salon' },
  ),
  ember: kit(
    { home: Frame, stations: Radio, tube: Film, search: ScanSearch, floor: MousePointer2, likes: Bookmark, chat: MessagesSquare, prev: Rewind, next: FastForward, share: Share, send: SendHorizontal },
    { home: 'Board', stations: 'Radio', tube: 'Reels', search: 'Find', floor: 'Studio', likes: 'Pinned', chat: 'Comments', inOrder: 'In order', shuffled: 'Remix', upNext: 'Up next', light: 'Bone', dark: 'Char', chatTitle: 'Comments', message: 'Drop a comment on the board' },
  ),
  signal: kit(
    { home: Terminal, stations: RadioTower, tube: MonitorPlay, search: ScanSearch, floor: Activity, likes: Star, chat: Terminal, prev: StepBack, next: StepForward, play: Play, pause: Square, share: ArrowUpRight, shuffle: Dices, send: CornerDownLeft },
    { home: 'Feed', stations: 'Bands', tube: 'Tube', search: 'Query', floor: 'Nodes', likes: 'Saved', chat: 'Log', inOrder: 'Seq', shuffled: 'Rand', upNext: 'Queue', light: 'Day ops', dark: 'Night ops', chatTitle: 'Channel log', message: '> transmit' },
  ),
  abyss: kit(
    { home: Waves, stations: RadioReceiver, tube: Film, search: Search, floor: Fish, likes: Anchor, chat: MessageCircle, prev: ChevronsLeft, next: ChevronsRight, share: Share2, send: ArrowUp },
    { home: 'Surface', stations: 'Frequencies', tube: 'Reels', search: 'Sonar', floor: 'Shoal', likes: 'Anchored', chat: 'Echoes', inOrder: 'Current', shuffled: 'Undertow', upNext: 'Next scene', light: 'Shallows', dark: 'The deep', chatTitle: 'Echoes', message: 'Send an echo' },
  ),
  grid: kit(
    { home: Hash, stations: Radio, tube: Tv, search: Search, floor: Users, likes: Bookmark, chat: Hash, prev: ArrowLeft, next: ArrowRight, share: ArrowUpRight, shuffle: Shuffle, send: ArrowRight },
    { home: 'Index', stations: 'Radio', tube: 'Tube', search: 'Search', floor: 'Floor', likes: 'Saved', chat: 'Notes', inOrder: 'Linear', shuffled: 'Random', upNext: 'Next', light: 'Paper', dark: 'Black', chatTitle: 'Notes', message: 'Write a note' },
  ),
  solar: kit(
    { home: Sun, stations: RadioReceiver, tube: Tv, search: Search, floor: Users, likes: Heart, chat: MessageCircle, prev: Rewind, next: FastForward, share: Share, send: Zap },
    { home: 'Noon', stations: 'Radio', tube: 'Tube', search: 'Search', floor: 'Floor', likes: 'Loved', chat: 'Chat', inOrder: 'Clockwise', shuffled: 'Any hour', upNext: 'Next hour', light: 'Sunrise', dark: 'Sunset', chatTitle: 'Sun room', message: 'Say something warm' },
  ),
  orbit: kit(
    { home: Rocket, stations: Satellite, tube: Tv, search: Telescope, floor: Earth, likes: Star, chat: Orbit, prev: ChevronsLeft, next: ChevronsRight, share: Send, send: Rocket },
    { home: 'Base', stations: 'Signals', tube: 'Screens', search: 'Scan', floor: 'Planet', likes: 'Stars', chat: 'Comms', inOrder: 'Route', shuffled: 'Warp', upNext: 'Next stop', light: 'Day side', dark: 'Night side', chatTitle: 'Comms', message: 'Radio the crew' },
  ),
  retro: kit(
    { home: LayoutDashboard, stations: Gauge, tube: MonitorPlay, search: Search, floor: Activity, likes: Asterisk, chat: MessageSquare, prev: SkipBack, next: SkipForward, share: ArrowUpRight, shuffle: ListOrdered, send: CornerDownLeft },
    { home: 'Board', stations: 'Radio', tube: 'Tube', search: 'Search', floor: 'Live', likes: 'Starred', chat: 'Feed', inOrder: 'Ordered', shuffled: 'Shuffled', upNext: 'Queue', light: 'Paper', dark: 'Night shift', chatTitle: 'Live feed', message: 'Post to the feed' },
  ),
};

export const useKit = (): Kit => KITS[useSkin((s) => s.skin)] ?? JAM;
