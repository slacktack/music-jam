# JAM — every radio, one floor

A mobile-first web app for listening to free live radio and songs **together**. There are no rooms and no sign-up: everyone who opens the site lands on one global "floor", sees who's here and what they're playing, joins anyone in one tap (songs join at the same second), chats and throws reactions. The catalogue is **desi first**: Hindi, Punjabi and Retro Hindi up top, then 14 more Indian languages and genres, 25 singers, festivals (Chhath, Diwali, Gurpurab, Holi, Navratri…) and moods like Gym, then global genres.

This file is the source of truth for humans and AI agents working on the repo. `AGENTS.md` points here.

## Quick start

Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Vite on http://localhost:5173 serves the UI and `/api/search`. The floor uses public Nostr relays by default, so nothing else needs to run.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (UI + `/api/search` middleware) |
| `npm run build` | Type-check (`tsc --noEmit`) then build to `dist/` |
| `npm start` | `server/index.js`: serves `dist/`, `/api/search`, and a Nostr relay at `/relay` |
| `npm run relay` | Standalone local Nostr relay on `ws://localhost:7777` |
| `npm run icons` | Re-render PNG app icons from `public/icons/icon.svg` (needs Playwright) |

There is no unit test suite. `npm run build` is the check before committing; for UI changes also look at a 390px-wide phone viewport and a ≥1280px desktop viewport.

## Deploying

**Vercel (primary).** Pushes deploy automatically. `vercel.json` builds with Vite, rewrites every non-API path to `index.html` (real URLs like `/vibe/hindi` work), and `api/search.js` becomes a serverless function. No environment variables are required.

**Any Node host** (Render, Railway, Fly, VPS): `npm run build && npm start`. `render.yaml` is ready for Render.

Optional build-time env vars:

| Var | Default | Meaning |
| --- | --- | --- |
| `VITE_RELAYS` | `wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.mom` | Comma-separated Nostr relays for the floor. Point at `wss://your-host/relay` to self-host. |
| `VITE_FLOOR` | `jam-floor-v2` | Floor name (the Nostr `t` tag). Change it to start a fresh, separate floor. |

## Data sources

| Source | Used for | How |
| --- | --- | --- |
| [Radio Browser](https://api.radio-browser.info/) (`de1`/`de2`/`all.api.radio-browser.info`) | All live radio: search, languages, genres, singer stations, station lookup for share links | Free, no key, CORS. Called from the browser in `src/lib/radio.ts`. Only `https://` streams are kept (mixed content). Plays are reported back via `/json/url/{uuid}` per their etiquette. |
| Each station's stream URL | Radio audio | Plain `<audio>` (plus lazy `hls.js` for `.m3u8`). **Keeps playing with the screen locked.** Stations go offline often; the UI shows "Off air". |
| YouTube | Songs: search + playback | `server/yt.js` calls YouTube's own web search JSON endpoint (`youtubei/v1/search`, fallback: parse the results page). No API key, region `IN`. Unofficial and may change; if song search breaks, look there first. Playback uses the official IFrame Player API (`src/lib/yt.ts`, `youtube-nocookie.com`). **Embeds pause when the screen locks** (only YouTube Premium avoids that), so the UI tells people to use radio for screen-off listening. Videos whose owners block embedding are skipped automatically. |
| `i.ytimg.com` | Song thumbnails and lock-screen artwork | `hq`/`sd`/`maxres` thumbnails. |
| Public Nostr relays | The floor: presence, chat, reactions | See below. |

No API keys, no accounts, no database.

## The floor (realtime over Nostr)

`src/lib/floor.ts`. Each browser generates a throwaway secp256k1 key (`localStorage['jam.sk']`) and signs events with `nostr-tools`. All events carry the tag `["t", VITE_FLOOR]`.

| Kind | Type | Content (JSON) | Purpose |
| --- | --- | --- | --- |
| `30778` | parameterized replaceable (`d` = floor) | `{name, color, track, at}` or `{gone:true}` | My current status. Re-sent every 25 s; others drop anyone silent for 75 s. `at` = epoch ms of song position 0 so joiners seek to the same second. |
| `4778` | regular (stored) | `{text, name, color, on}` | Chat. Last 12 h / 120 messages load on open. |
| `24778` | ephemeral | `{g, c}` | Reactions (`g` is one of the dot glyph ids in `src/lib/glyphs.ts`). |

Everything received is validated (`cleanTrack`, string limits, `https://` only, 11-char YouTube ids). Client-side rate limits: 1 chat/1.2 s, 1 reaction/350 ms. Note that anything posted is public on those relays.

`server/relay.js` is a tiny in-memory NIP-01 relay used for local testing and self-hosting (mounted at `/relay` by `server/index.js`).

## Routes

Real paths via the History API (`src/lib/router.ts`):

`/` home · `/search?q=` · `/vibe/:id` · `/artist/:id` · `/fest/:id` · `/floor` · `/chat` (mobile) · `/likes` · `/r/:stationuuid` shared radio · `/s/:videoId?t=title&a=artist` shared song.

Share links open the app with that station/song loaded and the player open, ready to tap play (browsers block autoplay with sound).

## File map

```
api/search.js              Vercel function -> server/yt.js
server/yt.js               Keyless YouTube search (shared by Vercel, Node server, Vite dev)
server/index.js            Node host: static dist/, /api/search, Nostr relay at /relay
server/relay.js            Minimal Nostr relay (NIP-01), in-memory
scripts/icons.mjs          Renders public/icons/*.png
public/                    manifest.webmanifest, sw.js (app-shell cache), icons
src/main.tsx               Boot: fonts, styles, render, startFloor(), service worker
src/App.tsx                Shell: rail/tab bar, routes, mobile player sheet, reactions, toasts, shared links
src/styles.css             All styles. Mobile first; desktop at >=1024px. Tokens at the top.
src/lib/catalog.ts         VIBES (desi first), ARTISTS, FESTIVALS (+ dates), search shortcuts
src/lib/radio.ts           Radio Browser client
src/lib/songs.ts           /api/search client, title cleanup
src/lib/player.ts          One player for radio (<audio>) and songs (YouTube); Media Session; lock-screen artwork
src/lib/yt.ts              YouTube IFrame API wrapper
src/lib/floor.ts           Nostr floor client + store
src/lib/flow.ts            Generative line-art renderer (waves, zigzag, rings, rays, contour, grid)
src/lib/artwork.ts         512px generated lock-screen artwork for radio
src/lib/glyphs.ts          7x7 dot glyphs for reactions/empty states
src/lib/{router,share,likes,toast,color,types}.ts
src/components/Art.tsx     FlowArt, DotText (cursor-reactive dot headline), DotGlyph, Avatar, Cover, Eq
src/components/Pages.tsx   Home, Collection (vibe/artist/festival), Search
src/components/Player.tsx  VideoHost/VideoSlot, Waveform, NowPlaying, MiniPlayer
src/components/Social.tsx  FloorView, Chat, Likes
src/components/{Lists,Tiles,collection,canvas}.ts(x)
```

## Adding content

- **Language/genre:** add to `VIBES` in `catalog.ts`. `radio` is a list of Radio Browser search params (`language`, `tag`, `name`, `countrycode`, `order`), `songs` is a YouTube query. Desi entries set `desi: true`.
- **Singer:** add to `ARTISTS` with `artist(id, label, sub, colors, pattern, stationNameOrNull, fallbackQueries)`. Check the directory first for a dedicated station: `https://de1.api.radio-browser.info/json/stations/search?name=<singer>&countrycode=IN`.
- **Festival/mood:** add to `FESTIVALS`. `dates` are the main day per year (lunar festivals are approximate; update yearly); `before`/`after` set the "Happening now" window. Empty `dates` = mood, always shown. `aliases` power search shortcuts (typos like "chath" included).

## Design system

- Near-black base (`#050507`), glass panels, a dot-matrix motif (Doto font for numbers/labels, canvas `DotText` hero, SVG `DotGlyph`s), and generative line art (`FlowArt`) instead of stock imagery. No emoji anywhere.
- Palette (`src/lib/color.ts`): saffron `#FF8A00`, marigold `#FFC300`, red `#E10600`, phosphor `#2BD94A`, lime `#D7FF3A`, indigo `#5B5BFF`, violet `#9B5CFF`, magenta `#FF2D95`, cyan `#00D1FF`, teal `#00E0B0`. Every track gets a stable colour pair; the playing pair is written to `--accent`/`--accent2` and the whole app cross-fades to it.
- Scrollbars are hidden everywhere; layout never scrolls horizontally.
- Canvases only animate while visible and the tab is in the foreground; `prefers-reduced-motion` is respected.

## Known limits

- YouTube songs stop when the phone locks; radio doesn't. Phone FM tuners are not reachable from the web.
- Song search depends on an unofficial YouTube endpoint.
- Public relays can be slow or drop events; the floor degrades gracefully and music keeps working.
