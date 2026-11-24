export type TrackKind = 'radio' | 'song';

/** Anything playable: a live radio station or a YouTube song. */
export interface Track {
  id: string; // radio: station uuid, song: "yt:<videoId>"
  kind: TrackKind;
  title: string;
  subtitle: string;
  url: string; // radio: https stream URL, song: YouTube video id
  art: string; // https image URL, or '' to use generated art
  duration?: number; // seconds, songs only
  live?: boolean;
  hls?: boolean;
  video?: boolean; // a YouTube video from the Tube section, watched rather than listened to
  views?: string; // display only, from the Tube section
  published?: string; // display only, e.g. "2 hours ago"
}

export interface FloorUser {
  id: string;
  name: string;
  color: string;
  track: Track | null;
  at: number; // songs: epoch ms when position 0 was, so joiners can sync
  me?: boolean;
}

export interface FloorSpot {
  track: Track;
  count: number;
  at: number;
  users: FloorUser[];
}

export interface ChatMsg {
  id: string;
  user: { id: string; name: string; color: string };
  text: string;
  on: string;
  ts: number;
  sys?: boolean; // floor activity line (joined / now playing), local only
  media?: { k: 'img' | 'gif'; s: string; alt?: string }; // private rooms only
}
