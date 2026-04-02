# ReadmeForAI — PhonicPhlip Development Context

This document captures the design decisions, constraints, and development history of PhonicPhlip to help any AI (or human) working on a fork understand why things are built the way they are.

## Origin

PhonicPhlip is a fork of [FlipOff](https://github.com/magnum6actual/flipoff), a split-flap display emulator. The original is a general-purpose message board. This fork repurposes it as a train departure board designed to teach phonics to a reception-aged child (4-5 years old, UK curriculum Phase 3/4 pink level).

The project was prototyped in a claude.ai conversation, then ported into Claude Code for proper version control and deployment. All code was written collaboratively between the project owner (Lawrence Deju-Wiseman) and Claude, with Lawrence directing design decisions and testing on real devices while Claude handled implementation.

## Architecture decisions and rationale

### Why vanilla JS, not React/Next/etc.

The primary deployment target is a Raspberry Pi Zero 2 W — a low-power single-board computer running Chromium in kiosk mode. Framework overhead (React, Vue, etc.) adds bundle size, build complexity, and runtime cost for zero benefit. The entire display page is under 100KB excluding the audio data. There is no build step — the browser loads the JS modules directly.

One fork (henrybabbage/flip-board-component) attempted a React/Next.js migration. We evaluated it and rejected it for this reason.

### Why a WebSocket relay instead of direct communication

The display runs on a TV (via Pi) and the control page runs on a phone. They're separate browser tabs on separate devices. Options considered:

- **localStorage/BroadcastChannel**: Only works same-browser, same-origin. Ruled out because display and control are on different devices.
- **WebRTC**: Peer-to-peer, but requires a signalling server anyway, and the connection setup is complex for what is just passing JSON messages.
- **WebSocket relay**: Simplest possible architecture. Server holds connections, broadcasts messages from any client to all others. The relay is ~25 lines of code. The server is stateless — all application state lives in the browsers.

### Why the relay is stateless

The display page owns all state (current departures, settings, clock). The control page requests state from the display on connect (`request_state` message), and the display replies with `board_state`. This means the server can crash, restart, or hibernate without losing anything. This property is critical for the Cloudflare Durable Objects deployment, where the relay hibernates between messages.

### Why two deployment paths

- **Local/Pi**: `python server.py` using aiohttp. Serves static files and runs the WebSocket relay. This is the primary use case — a Pi connected to a TV on a home network.
- **Cloudflare Workers**: For remote access, demos, and development without the Pi. Static files served from CDN edge (free, unlimited). WebSocket relay via a Durable Object using the Hibernation API (free tier). The same client code works in both environments because it constructs the WebSocket URL from `location.host`.

### Why GitHub Pages was retired

We initially deployed static files to GitHub Pages, but it can't run WebSocket servers. Once Cloudflare Workers was set up (serving both static files and WebSocket relay), GitHub Pages became redundant. One URL, full functionality.

## Phonics constraints — critical for any fork

Every destination word must be **strictly decodable** at Phase 3/4 level. This is the core educational requirement and must not be relaxed. Specifically:

- **No silent letters.** "Thame" has a silent E that changes the A sound. "Vale" has a magic E. "Gate" has a magic E. None of these are decodable at this level.
- **No exception words.** "Said", "the", "was" — words that don't follow phonics rules. These are taught separately by rote and must not appear as destinations.
- **No irregular pronunciations.** "Cough", "though", "through" — same letter pattern, different sounds. A Phase 3/4 reader can't decode these.
- **No function words.** "This", "That", "With", "Then" — even if decodable, they don't work as station names.
- **Words must sound like plausible station names.** Real UK places preferred where they fit (HULL, BATH, SHAW). Invented names acceptable if they sound right (DOG TOWN, ASH HALT).

The word bank in `config.js` is curated by hand. Any additions must pass all five constraints. Known issue: BEEK in the ee digraph list is not a real word or place and should be replaced (BEECH has a silent letter so doesn't qualify).

### Digraph handling

Digraph words (containing sh, ch, th, oo, ee) are used sparingly — default 25% of departures. Each digraph can be toggled individually from the control page. This lets a parent match the display to exactly which digraphs the child is currently learning.

### Suffix handling

About 40% of departures get a second word (suffix): TOWN, STOP, HALT, PARK, etc. All suffixes are themselves decodable. The combined name must fit within the destination tile count. Suffixes are all real components of UK place names.

## Layout decisions

### Grid sizing

The display uses CSS `clamp()` throughout for responsive sizing. The `vw`-based middle values scale with viewport width. The ceilings were raised significantly from the original FlipOff values to accommodate large TVs viewed from several metres away.

Early iterations used `fr`-based grid columns with `max-width` caps. These caused clipping on the right edge because the tile content widths didn't match the fractional ratios. The fix was switching to `auto 1fr auto auto` grid columns — time, platform, and status are sized to their tile content, destination takes remaining space.

### Column header removal

The TIME / DESTINATION / PLAT / STATUS header row was removed. It caused alignment problems with the tile columns below, and the target user (a 4-year-old) can't read the headers anyway.

### Colon tile

The ":" in the time column (e.g., "08:41") is narrower than digit tiles to avoid excessive padding around the character. It's also marked as static — it never scrambles during refresh, because it's always ":".

### Mobile layout

Mobile detection uses user agent sniffing rather than CSS media queries, because some phones (notably iPadOS Safari) report desktop-width viewports. The `.mobile` class on `<body>` triggers: smaller clock, 2 departure rows instead of 4, no status column, truncated destination, tighter spacing.

## Message protocol

Messages between display and control are JSON over WebSocket. Types:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `board_state` | display -> control | Current departures and settings |
| `refresh` | control -> display | Generate new random departures |
| `custom_departures` | control -> display | Show specific departures |
| `update_settings` | control -> display | Apply settings changes |
| `request_state` | control -> display | Ask display to send current state |

## Settings

All settings are controlled from the phone and sent to the display via `update_settings`:

| Setting | Values | Default | Purpose |
|---------|--------|---------|---------|
| clockFormat | 12, 24 | 24 | Clock display format |
| showSeconds | bool | false | Show seconds on clock |
| titleCase | bool | false | false=ALL CAPS, true=Title Case |
| maxWordLength | 3-7 | 5 | Maximum base word length |
| digraphFrequency | 0-1 | 0.25 | Proportion of digraph words |
| suffixChance | 0-1 | 0.4 | Chance of adding suffix word |
| activeDigraphs | array | [sh,ch,th,oo,ee] | Which digraphs are enabled |
| autoRefreshSeconds | 0-120 | 0 | Auto-refresh interval (0=off) |
| maxPlatform | 1-99 | 10 | Maximum platform number |

## Known issues and future work

- BEEK in the ee digraph list needs replacing (not a real word or place)
- Word bank may contain words that don't sound like plausible station names — ongoing curation
- Quiz mode (planned): missing letter in destination, child says the word
- Real-time clock-relative departures: times that advance through the day
- The control page is a single self-contained HTML file with inline CSS/JS — this was a deliberate choice for simplicity but makes it harder to maintain as it grows

## Development environment

- **Work laptop**: `python -m http.server 8080` for static file serving. No WebSocket testing (corporate network restrictions). Focus on visual/design iteration.
- **Home**: `python server.py` for full stack including WebSocket. Pi testing with real TV.
- **Deployment**: `npx wrangler deploy` from the repo root pushes to Cloudflare Workers.
- **Git workflow**: Claude Code edits files and pushes to GitHub. Lawrence tests on device and reports back.
