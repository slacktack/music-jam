# JAM — every radio, one floor

A web app (mobile + desktop) for listening to free live internet radio **together**. There are no rooms and no sign-up: everyone who opens the site lands on the same global "floor", can see who else is here and what they're listening to, jump onto anyone's station in one tap, chat, and throw emoji reactions.

This file is the source of truth for humans and AI agents working on the repo.

## Quick start

Requires Node 20+.

```bash
npm install
```

```bash
npm run dev
```

`npm run dev` starts two processes: Vite on http://localhost:5173 (the UI, with `/ws` proxied) and the floor server on port 8787.

Production (one process serves the built site and the WebSocket):

```bash
npm run build
```

```bash
npm start
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server + floor server, hot reload |
| `npm run build` | Type-check (`tsc --noEmit`) then build to `dist/` |
| `npm start` | `node server/index.js`: serves `dist/` and `/ws` on `PORT` (default 8787) |
| `npm run preview` | build + start |

There is no test suite or linter yet. `npm run build` is the check to run before committing.

## Stack

- **Frontend:** React 19 + TypeScript + Vite. State in [zustand](https://github.com/pmndrs/zustand) stores. Animation with [motion](https://motion.dev) (`motion/react`). Icons from `lucide-react`. Styling is one hand-written stylesheet, `src/styles.css` (no Tailwind, no CSS-in-JS).
- **Fonts (self-hosted via Fontsource):** Geist Variable (UI) and Doto (the dot-matrix display face used for counters and labels, class `.doto`).
- **Backend:** `server/index.js`, a single dependency-light Node file (`ws` only). All state is in memory.
- **Streams:** plain `<audio>`; `hls.js` is lazy-loaded only for `.m3u8` stations.

## File map

```
index.html              Vite entry
server/index.js         Static file server + the floor (WebSocket at /ws)
src/main.tsx            Boot: fonts, styles, startFloor(), render
src/App.tsx             Shell: ambient background, rail/tab bar, identity editor, sheet, reactions, toasts
src/styles.css          All styling + design tokens (see "Design system")
src/lib/types.ts        Station, FloorUser, FloorStation, ChatMsg
src/lib/radio.ts        Station directory client, VIBES (genre/language presets), FALLBACK list
src/lib/player.ts       Audio engine + player store (play/toggle/skip/volume, Media Session)
src/lib/floor.ts        WebSocket client + floor store (presence, chat, reactions, identity)
src/lib/likes.ts        Liked stations (localStorage)
src/lib/color.ts        Palette + deterministic colors/PRNG from a seed
src/lib/toast.ts        Tiny toast store
src/components/Art.tsx          GlyphArt (generated covers), Avatar, EqBars, Visualizer
src/components/StationCard.tsx  Station tile
src/components/Discover.tsx     "Radio" tab: hero, search, vibe chips, grids
src/components/Floor.tsx        FloorView (clusters + people), LikesView, Chat
src/components/NowPlaying.tsx   Full player (desktop side card / mobile sheet) + MiniPlayer
vercel.json             Static deploy of the frontend on Vercel
render.yaml             Full deploy (site + floor server) on Render
```

## Data sources

| Source | Used for | Notes |
| --- | --- | --- |
| [Radio Browser API](https://api.radio-browser.info/) (`de1` / `de2` / `all.api.radio-browser.info`) | The whole station catalogue: search, genres, languages, trending | Free, community-run, no API key, CORS enabled. Called **directly from the browser** in `src/lib/radio.ts`. Hosts are tried in order and the first working one is remembered. Endpoint: `/json/stations/search` with `hidebroken=true&is_https=true`. Plays are reported back via `/json/url/{stationuuid}` (their etiquette; it feeds trending). |
| Each station's own stream URL (`url_resolved`) | The audio | Streams come from thousands of third-party broadcasters. Only `https://` streams are kept (the site is HTTPS, so `http://` would be blocked as mixed content). Stations go offline regularly; the player shows "Off air" and a toast. |
| Station `favicon` URLs | Cover art, when usable | Only shown if the image loads and is at least 96px wide; otherwise the generated glyph art is used. |
| [SomaFM](https://somafm.com) (`ice1.somafm.com`) | `FALLBACK` list in `radio.ts` | Shown only if the directory can't be reached. Listener-supported, commercial-free. |

No API keys or secrets anywhere. No user accounts. No database.

### Vibes (the chips)

`VIBES` in `src/lib/radio.ts` is the list of chips. Each vibe is `{ id, label, color, queries }` where `queries` is an array of Radio Browser search params; the result lists are fetched in parallel, interleaved, and de-duplicated by id, normalised name and URL. To add a language or genre, add one entry. Useful params: `language` (e.g. `hindi`, `punjabi`, `tamil`), `tag` (substring match), `name` (substring match), `countrycode` (`IN`, `US`…), `order` (`clickcount`, `clicktrend`, `votes`).

Current vibes: Trending, Hindi, Retro Hindi, Bollywood, Punjabi, English Hits, Lo-fi, Hip-hop, Electronic, House, Techno, Ghazal & Sufi, Tamil, Rock, Jazz, Chill, 90s, K-pop, Synthwave, Drum & Bass, Reggae, Latin, Classical, Metal. The directory has no "retro Hindi" tag worth relying on, so that vibe is assembled from several name/tag queries (retro, 90s, gold, Kishore, Rafi, Lata, Vividh Bharati…).

## The floor (realtime)

One WebSocket endpoint, `/ws`, one global space. JSON messages, max 4 KB.

Client → server:

| `type` | Payload | Meaning |
| --- | --- | --- |
| `hello` | `name`, `color`, `station \| null` | Join, or update identity. Server replies `welcome` on first hello. |
| `tune` | `station \| null` | What I'm listening to now (`null` = paused/stopped). |
| `chat` | `text` (≤280) | Message to everyone. |
| `react` | `emoji` | Floating emoji for everyone. |

Server → client:

| `type` | Payload |
| --- | --- |
| `welcome` | `id`, `history` (last 60 chat messages) |
| `presence` | `total`, `users[]` (`id,name,color,stationId`; capped at 250), `stations[]` (station + `count`, top 60). Broadcast at most every 800 ms, only when something changed. |
| `chat` | `id`, `user`, `text`, `station`, `ts` |
| `react` | `emoji`, `user`, `stationId` |

Server rules: every string is truncated and stripped of control characters; station URLs must be `https://`; chat is limited to 6 messages / 10 s, reactions 12 / 5 s, tunes 20 / 10 s per connection; dead sockets are dropped by a 30 s ping. State is in memory, so a restart clears chat history, and running more than one server instance would split the floor (add Redis pub/sub or similar before scaling horizontally).

The client (`src/lib/floor.ts`) reconnects with exponential backoff and the app stays fully usable for listening while the floor is offline. A user counts as "on" a station only while their player is loading or playing.

Identity is a random name + color stored in `localStorage` (`jam.me`), editable from the chip in the top bar. Other keys: `jam.likes`, `jam.volume`, `jam.vibe`.

## Design system

- Dark, glassy, with a dot-matrix "glyph" motif. Tokens live at the top of `src/styles.css`.
- Palette (`src/lib/color.ts`): indigo `#5B5BFF`, phosphor `#2BD94A`, red `#E10600`, amber `#FFB300`, cyan `#00D1FF`, magenta `#FF2D95`, violet `#9B5CFF`, orange `#FF6A00`.
- Every station gets a deterministic color pair from its id (`colorsFor`). The playing station's pair is written to `--accent` / `--accent2` on `<html>`; these are registered `@property` colors, so the ambient background, glows, nav pill and buttons cross-fade when the station changes.
- Cover art and avatars are generated SVG dot patterns seeded by id/name (`GlyphArt`, `Avatar`), so nothing depends on third-party images.
- The visualizer is synthesized, not real audio analysis: radio streams are cross-origin without CORS headers, so Web Audio can't read them.
- Layout: under 1024px it is a single column with a floating dock (mini player + 4 tabs: Radio, Floor, Chat, Likes) and a draggable full-screen player sheet. From 1024px it is a 3-column grid: icon rail, content, and a side column with the player and floor chat always visible.
- `prefers-reduced-motion` is respected.

## Deploying

The app has two parts: static files (`dist/`) and the long-lived floor WebSocket server.

**Option A, everything on one Node host (simplest).** Render, Railway, Fly.io, a VPS: build with `npm run build`, run `npm start`, expose `PORT`. `render.yaml` is ready for Render.

**Option B, frontend on Vercel + floor server elsewhere.** `vercel.json` deploys the static site. Vercel functions can't hold WebSocket connections open, so the floor server must run on a Node host (Option A's host works; it also allows cross-origin sockets). Then set this environment variable in the Vercel project and redeploy:

```
VITE_WS_URL=wss://your-floor-host.example.com/ws
```

Without `VITE_WS_URL` the Vercel site still plays radio, but the floor shows as offline (no presence or chat).

## Conventions

- Keep the server a single file with no framework unless there's a real need.
- New UI goes in `src/components`, state in a zustand store under `src/lib`. Reuse `StationCard`, `GlyphArt`, `Avatar`.
- Never render user-supplied strings as HTML; React text nodes only. Validate anything new on the server too.
- Only `https://` stream and image URLs.
- Check both breakpoints (390px wide and ≥1280px wide) after UI changes.
