import type { Query } from '../lib/catalog';
import { usePlayer } from '../lib/player';
import { searchSongs } from '../lib/songs';
import { stationsFor } from '../lib/radio';
import { toast } from '../lib/toast';

/** One-tap play for a vibe/festival: songs first, radio if songs are unavailable. */
export async function playCollection(c: { songs: string; radio: Query[]; label: string }, prefer: 'songs' | 'radio' = 'songs') {
  const tryRadio = async () => {
    const list = await stationsFor(c.radio);
    if (!list.length) throw new Error('empty');
    usePlayer.getState().play(list[0], list, `${c.label} radio`);
  };
  const trySongs = async () => {
    // 3 of the section's queries is enough for a long, shufflable queue without
    // making the first tap wait for five searches to come back.
    const list = (await searchSongs(c.songs, undefined, 3)).filter((t) => !t.live);
    if (!list.length) throw new Error('empty');
    usePlayer.getState().play(list[0], list, c.label);
  };
  try {
    await (prefer === 'songs' ? trySongs() : tryRadio());
  } catch {
    try {
      await (prefer === 'songs' ? tryRadio() : trySongs());
    } catch {
      toast(`Couldn't load ${c.label} right now. Try again in a moment.`);
    }
  }
}
