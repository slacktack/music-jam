# JAM — every radio, one floor

A mobile-first web app for listening to free live radio and songs **together**. There is no sign-up: everyone who opens the site lands on one global "floor", sees who's here and what they're playing, joins anyone in one tap (songs join at the same second), chats and throws reactions. Need privacy? One tap opens a **private room** — a link that is also the encryption key, so only people holding it can read the room. The catalogue is **desi first**: Hindi, Punjabi and Retro Hindi up top, then 14 more Indian languages and genres, 25 singers, festivals (Chhath, Diwali, Gurpurab, Holi, Navratri…) and moods like Gym, then global genres. Want the whole platform? The **Tube** tab browses all of YouTube — shelves, autocomplete and full videos. And nine **skins** rebuild the interface, not just the colours.

This file is the source of truth for humans and AI agents working on the repo. `AGENTS.md` points here.

## Quick start

Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Vite on http://localhost:5173 serves the UI and `/api/search`, `/api/videos` and `/api/suggest`. The floor uses public Nostr relays by default, so nothing else needs to run.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (UI + the three `/api/*` endpoints) |
| `npm run build` | Type-check (`tsc --noEmit`) then build to `dist/` |
| `npm start` | `server/index.js`: serves `dist/`, the `/api/*` endpoints, and a Nostr relay at `/relay` |
| `npm run relay` | Standalone local Nostr relay on `ws://localhost:7777` |
| `npm run icons` | Re-render PNG app icons from `public/icons/icon.svg` (needs Playwright) |

There is no unit test suite. `npm run build` is the check before committing; for UI changes also look at a 390px-wide phone viewport and a ≥1280px desktop viewport, and check every skin in both modes (press `T` to cycle skins).

## Deploying

**Vercel (primary).** Pushes deploy automatically. `vercel.json` builds with Vite, rewrites every non-API path to `index.html` (real URLs like `/vibe/hindi` work), and `api/search.js`, `api/videos.js` and `api/suggest.js` become serverless functions — all three call the same `respond()` core in `server/yt.js`. No environment variables are required.

**Any Node host** (Render, Railway, Fly, VPS): `npm run build && npm start`. `render.yaml` is ready for Render.

Optional build-time env vars:

| Var | Default | Meaning |
| --- | --- | --- |
| `VITE_RELAYS` | `wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.mom` | Comma-separated Nostr relays for the floor. Point at `wss://your-host/relay` to self-host. |
| `VITE_FLOOR` | `jam-floor-v2` | Floor name (the Nostr `t` tag). Change it to start a fresh, separate floor. |
| `VITE_GIPHY_KEY` | unset | With a key, the room GIF picker searches Giphy in place. Without one, the GIF button takes a pasted `https://` link. Nothing else changes. |

## Data sources

| Source | Used for | How |
| --- | --- | --- |
| [Radio Browser](https://api.radio-browser.info/) (`de1`/`de2`/`all.api.radio-browser.info`) | All live radio: search, languages, genres, singer stations, station lookup for share links | Free, no key, CORS. Called from the browser in `src/lib/radio.ts`. Only `https://` streams are kept (mixed content). Plays are reported back via `/json/url/{uuid}` per their etiquette. |
| Each station's stream URL | Radio audio | Plain `<audio>` (plus lazy `hls.js` for `.m3u8`). **Keeps playing with the screen locked.** Stations go offline often; the UI shows "Off air" and walks the rest of the queue. |
| YouTube | Songs, and the Tube tab's whole-video browse | `server/yt.js` calls YouTube's own web JSON endpoint (`youtubei/v1/search`) with a `videos` filter, then follows the paging token for a second page so a search returns ~40 videos instead of 20. `listVideos()` is the Tube path (no music duration filter, keeps views and upload date, returns the continuation token); `suggest()` reads Google's `complete/search?ds=yt` autocomplete. Fallback: parse the results HTML. No API key, region `IN`. Unofficial and may change; if search breaks, look there first. Playback uses the official IFrame Player API (`src/lib/yt.ts`, `youtube-nocookie.com`). **Embeds pause when the screen locks** (only YouTube Premium avoids that), so the UI tells people to use radio for screen-off listening. Videos whose owners block embedding are skipped automatically. |
| `i.ytimg.com` | Song and video thumbnails, lock-screen artwork | `mq`/`hq`/`sd`/`maxres` thumbnails. |
| Public Nostr relays | The floor and private rooms: presence, chat, reactions | See below. |
| Giphy (optional) | Room GIF picker | Only when `VITE_GIPHY_KEY` is set at build time. |

No required API keys, no accounts, no database.

## The floor (realtime over Nostr)

`src/lib/floor.ts`. Each browser generates a throwaway secp256k1 key (`localStorage['jam.sk']`) and signs events with `nostr-tools`. All events carry the tag `["t", <space>]` — the floor name globally, or a room's namespace inside a room.

| Kind | Type | Content (JSON) | Purpose |
| --- | --- | --- | --- |
| `30778` | parameterized replaceable (`d` = space) | `{name, color, track, at}` or `{gone:true}` | My current status. Re-sent every 25 s; others drop anyone silent for 75 s. `at` = epoch ms of song position 0 so joiners seek to the same second. |
| `4778` | regular (stored) | `{text, name, color, on, m?}` | Chat. Last 12 h / 120 messages load on the floor; a room loads only its 15-minute window. `m` is an attachment, rooms only. |
| `24778` | ephemeral | `{g, c}` | Reactions (`g` is one of the dot glyph ids in `src/lib/glyphs.ts`). |

Everything received is validated (`cleanTrack`, string limits, `https://` only, 11-char YouTube ids, `safeMedia` for attachments). Client-side rate limits: 1 chat/1.2 s, 1 reaction/350 ms. Anything posted to the open floor is public.

`server/relay.js` is a tiny in-memory NIP-01 relay used for local testing and self-hosting (mounted at `/relay` by `server/index.js`).

## Private rooms

`src/lib/rooms.ts`. A room **is** a key — there is no room table, no server and no account.

- The room secret is `sha256(my signing key || "jam-private-room-v1")`, so the same device always derives the same room, code and link. Nothing to remember, nothing to store on our side.
- The share link is `https://host/room/<12 hex>#k=<64 hex>`. The path is only a label; the key lives in the fragment, which browsers never send to a server. On boot `currentRoom()` reads it, saves it in `localStorage['jam.room']`, and the URL is replaced with `/floor` so the secret stops sitting in history.
- Inside a room every payload is **NIP-44 encrypted** (`nostr-tools/nip44`). A sender computes `getConversationKey(mySk, roomPk)`; anyone holding `roomSk` derives the same shared secret with `getConversationKey(roomSk, senderPk)`. Relays store ciphertext only.
- **Room chat expires**: anything older than 15 minutes is dropped on load, on subscribe and on the housekeeping tick.
- **Leaving is seamless**: `leaveRoom()` seals a `gone` presence into the room you are leaving, clears the roster and chat, resubscribes to the floor and re-announces. The song never stops — the space switch never touches `player.ts`.
- Rooms carry attachments the floor does not: emoji, GIFs and a photo taken on the spot (`src/lib/media.ts`, `src/components/ChatMedia.tsx`). Photos are downscaled to a 320px long edge and re-encoded until the data URL fits under ~26 KB, so an encrypted event stays inside what public relays accept. Tapping one opens the in-app viewer (`MediaViewer`); a `data:` URL cannot be handed to a new tab.
- Joining needs no account: open the link, or paste it into the room card on the floor page.

## Routes

Real paths via the History API (`src/lib/router.ts`):

`/` home · `/radio/:tab` Radio & FM hub (`india`, `fm`, `hindi`, `punjabi`, `retro`, …) · `/search?q=` · `/vibe/:id` · `/artist/:id` · `/fest/:id` · `/floor` · `/chat` (mobile) · `/likes` · `/tube` all of YouTube · `/themes` skin gallery · `/room/:code` room landing (the key arrives in `#k=`) · `/r/:stationuuid` shared radio · `/s/:videoId?t=title&a=artist` shared song.

Share links open the app with that station/song loaded and the player open, ready to tap play (browsers block autoplay with sound). A `/room/…` link consumes its key, then routes to `/floor` with the room active.

## File map

```
api/search.js              Vercel function -> server/yt.js (/api/search)
api/videos.js              Vercel function -> server/yt.js (/api/videos, Tube + paging)
api/suggest.js             Vercel function -> server/yt.js (/api/suggest, autocomplete)
server/yt.js               Keyless YouTube search, video browse and suggestions (shared by Vercel, Node, Vite dev)
server/index.js            Node host: static dist/, /api/*, Nostr relay at /relay
server/relay.js            Minimal Nostr relay (NIP-01), in-memory
scripts/icons.mjs          Renders public/icons/*.png
public/                    manifest.webmanifest, sw.js (app-shell cache), icons
src/main.tsx               Boot: fonts, styles, skin, render, startFloor(), service worker
src/App.tsx                Shell: rail/tab bar, routes, player sheet, reactions, toasts, share, viewer, cursor
src/styles.css             All styles. Mobile first; desktop at >=1024px. Tokens at the top.
src/styles/skins.css       The nine skins: chrome, cards, cursors, player grounds. Never matches [data-skin="jam"].
src/lib/catalog.ts         VIBES (desi first), ARTISTS, FESTIVALS (+ dates), search shortcuts
src/lib/radio.ts           Radio Browser client
src/lib/songs.ts           /api/search client, title cleanup, "||" multi-query fan-out
src/lib/tube.ts            /api/videos + /api/suggest client, the twelve shelves
src/lib/player.ts          One player for radio (<audio>) and YouTube; queue order, shuffle, Media Session
src/lib/yt.ts              YouTube IFrame API wrapper
src/lib/floor.ts           Nostr floor and rooms client + store, room chat expiry
src/lib/rooms.ts           Deterministic room keys, link parsing, NIP-44 seal/open
src/lib/media.ts           Room attachments: emoji, Giphy, camera, downscale, validation
src/lib/skins.ts           Skin registry: light + dark palettes, fonts, cursor flag, switch wipe
src/lib/flow.ts            Generative line-art renderer (waves, zigzag, rings, rays, contour, grid)
src/lib/artwork.ts         512px generated lock-screen artwork for radio
src/lib/glyphs.ts          7x7 dot glyphs for reactions/empty states
src/lib/{router,share,likes,toast,color,types}.ts
src/components/Art.tsx     FlowArt, DotText (cursor-reactive dot headline), DotGlyph, Avatar, Cover, Eq
src/components/Pages.tsx   Home, Collection (vibe/artist/festival), Search
src/components/Player.tsx  VideoHost/VideoSlot, Waveform, NowPlaying, MiniPlayer, Theater
src/components/Social.tsx  FloorView, Chat, Likes
src/components/Rooms.tsx   Room card (create / invite / join / leave), room chip, link landing
src/components/Tube.tsx    Shelves, autocomplete, video results, infinite scroll
src/components/Skins.tsx   Skin picker tiles (each previews its own palette) and the /themes gallery
src/components/Share.tsx   In-app share sheet, with the room invite kept separate from a public link
src/components/ChatMedia.tsx Room emoji / GIF / camera bar and the full-screen media viewer
src/components/Cursor.tsx  Lerped ring + dot cursor publishing speed, angle and magnet variables
src/components/{Lists,Tiles,collection,canvas}.ts(x)
android/                   Kotlin source for the Jam APK (Compose + NewPipe); ui/Tube.kt is its YouTube tab
```

## Skins

`src/lib/skins.ts` + `src/styles/skins.css`. Ported from the folio-website themes. **JAM is the default and is never matched by a skin rule**, so the stock look cannot regress.

Nine skins: Crimson (broadsheet red), Aurora (violet sheets, serif italics, film grain), Orbit (daylight HUD), Abyss (teal console), Signal (dispatch desk, LEDs), Ember (warm paper, DM Serif), Grid (Swiss blue), Solar (yellow, hard offsets), Retro (indigo ledger on cream).

- A skin is a **token set** written on `<html>` (`--bg`, `--s1`…`--s3`, `--text`, `--line`, `--edge`, `--card`, `--hair`, `--lift`, `--r1`…`--r4`, `--sans`/`--display`/`--dot`, `--np-*` for the player) plus rules keyed on `html[data-skin="…"]`. Structure is tinted with the skin's own accent — `--edge` replaces black/white for rules, shadows and ink text — so skins read as colour, not greyscale.
- **Every skin ships a light and a dark palette.** The Dark mode button beside the theme icon flips whichever is active; on the stock skin it defers to `theme.ts`.
- Skins rebuild chrome, not just paint: masthead, desktop rail (Signal/Grid/Crimson widen it and keep labels visible), card geometry, section rules, chat bubbles, the player ground, and their own cursor (Aurora lime dot with a stretching violet ring, Signal and Grid crosshairs, Solar a clock hand, Orbit a reticle, Ember an arrow, Abyss a difference-blend disc). Crimson and Retro keep the real pointer, and the pointer is only suppressed on `pointer: fine` when the skin actually draws one (`html[data-cursor="on"]`).
- Fonts load per skin from Google Fonts on first use, so the default pays nothing. **A Google Fonts URL that contains one bad axis tuple returns 200 while silently dropping that family** — verify each family is in the response body, not just the status.
- Switching plays a wipe in the new skin's colours. `jam.skin` and `jam.skinMode` persist; `T` cycles skins, `S` toggles shuffle.

## Adding content

- **Language/genre:** add to `VIBES` in `catalog.ts`. `radio` is a list of Radio Browser search params (`language`, `tag`, `name`, `countrycode`, `order`), `songs` is a YouTube query. Desi entries set `desi: true`.
- **Singer:** add to `ARTISTS` with `artist(id, label, sub, colors, pattern, stationNameOrNull, fallbackQueries)`. Check the directory first for a dedicated station: `https://de1.api.radio-browser.info/json/stations/search?name=<singer>&countrycode=IN`.
- **Radio hub tab:** add to `RADIO_TABS` in `catalog.ts`.
- **Festival/mood:** add to `FESTIVALS`. `dates` are the main day per year (lunar festivals are approximate; update yearly); `before`/`after` set the "Happening now" window. Empty `dates` = mood, always shown. `aliases` power search shortcuts (typos like "chath" included).

## Design system

- Near-black base (`#050507`), glass panels, a dot-matrix motif (Doto font for numbers/labels, canvas `DotText` hero, SVG `DotGlyph`s), and generative line art (`FlowArt`) instead of stock imagery. No emoji anywhere.
- Palette (`src/lib/color.ts`): saffron `#FF8A00`, marigold `#FFC300`, red `#E10600`, phosphor `#2BD94A`, lime `#D7FF3A`, indigo `#5B5BFF`, violet `#9B5CFF`, magenta `#FF2D95`, cyan `#00D1FF`, teal `#00E0B0`. Every track gets a stable colour pair; the playing pair is written to `--accent`/`--accent2` and the whole app cross-fades to it.
- Scrollbars are hidden everywhere; layout never scrolls horizontally.
- Canvases only animate while visible and the tab is in the foreground; `prefers-reduced-motion` is respected.

## Performance rules

- Every canvas goes through `useCanvas` (`src/components/canvas.ts`): FPS-capped, paused off-screen, in background tabs and behind the player sheet (`layer: 'page'`).
- `LITE` mode (≤4 cores or ≤4 GB RAM, or reduced motion) drops blur, glow and most animation; `.touch` drops per-element blur on phones.
- The YouTube iframe overlay (`VideoHost`) tracks its slot every frame only while something moves, otherwise 4×/s.

## Known limits

- YouTube songs stop when the phone locks; radio doesn't. Phone FM tuners are not reachable from the web.
- Song search depends on an unofficial YouTube endpoint.
- Public relays can be slow or drop events; the floor degrades gracefully and music keeps working.
