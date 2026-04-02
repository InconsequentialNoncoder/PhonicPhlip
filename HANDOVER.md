# Session Handover — PhonicPhlip

This document briefs a new Claude Code session on the current state of the PhonicPhlip project. Read this alongside `ReadmeForAI.md` (design decisions) and `README.md` (user-facing docs).

## Repo

- **GitHub:** `InconsequentialNoncoder/PhonicPhlip`
- **Clone:** `gh repo clone InconsequentialNoncoder/PhonicPhlip`
- **Live URL:** https://phonic-phlip.inconsequentialnoncoder.workers.dev
- **Control page:** https://phonic-phlip.inconsequentialnoncoder.workers.dev/control

## Owner

Lawrence Deju-Wiseman. See `ReadmeForAI.md` for communication preferences. Key points: no praise, no filler, push back on weak reasoning, concise prose.

## Deployment

Two deployment targets:

### Cloudflare Workers (hosted)
```
npm install          # one-time, installs wrangler
npx wrangler login   # one-time, opens browser for OAuth
npx wrangler deploy  # deploys to Cloudflare
```
- Static files served from CDN (free, unlimited)
- WebSocket relay via Durable Object with Hibernation API
- Named sessions persist settings in DO SQLite storage
- Config: `wrangler.toml`, Worker code in `src/worker.js` + `src/relay.js`
- Assets exclusion: `.assetsignore` file (prevents node_modules etc from uploading)

### Local / Raspberry Pi
```
python server.py     # full server with WebSocket relay
python -m http.server 8080  # static only (work laptop fallback)
```

## What was done this session

In chronological order:

1. **Project setup** — extracted ZIP from claude.ai conversation, installed GitHub CLI, authenticated, pushed to GitHub
2. **TV layout** — removed max-width caps, raised clamp() ceilings for widescreen TVs, switched to auto-sized grid columns, narrowed tile widths, removed header row, narrowed colon tile, made colon static (no scramble)
3. **Mobile layout** — user agent detection (not media queries), 2 rows instead of 4, no status column, trimmed destination, Safari/iPadOS fix
4. **Platform improvements** — 2-digit platform support, unique platforms per refresh, maxPlatform setting (up to 99)
5. **GitHub Pages** — set up then retired in favour of Cloudflare
6. **Cloudflare Workers deployment** — installed Node.js + wrangler, created Worker + Durable Object relay, deployed. Free tier.
7. **Phonics phase system** — replaced flat word bank with 8 curriculum-aligned groups (Phase 2-6, ~240 words). Phase toggles on control page. Individual digraph (14) and trigraph (4) toggles filtering across all phases.
8. **Refresh-on-change toggle** — auto-refresh the board when settings change
9. **Multi-session support** — session identifiers route to isolated Durable Objects. Named sessions persist settings in SQLite. Sync button on display, session bar on control page. Guest mode (no session) works as before.
10. **Config button** — opens control page from display, passes session ID via URL parameter

## Current state

Everything is deployed and working. No known bugs from this session. The user was about to test the multi-session feature when they decided to switch to Claude Code web.

## Key files

| File | Purpose |
|------|---------|
| `js/config.js` | Phase word banks, suffixes, settings defaults, animation config |
| `js/WordBank.js` | Phase-based word selection, digraph/trigraph filtering, suffix logic |
| `js/main.js` | Display entry point, WebSocket, session sync, toolbar |
| `js/session.js` | Session management (localStorage, URL building) |
| `js/DepartureBoard.js` | Clock + departure rows |
| `js/Tile.js` / `js/TileRow.js` | Split-flap animation |
| `control/index.html` | Self-contained control page (inline CSS/JS) |
| `css/board.css` | All display styling including mobile and sync widget |
| `src/worker.js` | Cloudflare Worker — routes /ws?session= to Durable Objects |
| `src/relay.js` | Durable Object — WebSocket relay + settings persistence |
| `server.py` | Python server for local/Pi use |

## Things not yet done

- Pi hardware testing (Pi ordered, not yet arrived as of 2026-04-02)
- Quiz mode (planned: missing letter in destination, child says the word)
- Real-time clock-relative departures
- Some Phase 3 words contain multiple digraphs (CHURCH has ch+ur, MARSH has ar+sh) — disabling either blocks the word, which may confuse parents
- Word bank curation — some words may not sound like plausible station names
- The control page is a single 600+ line HTML file — works but getting large

## Environment notes

- The user is on a Windows 11 work laptop with corporate network restrictions
- `python -m http.server 8080` works; `python server.py` (aiohttp) may not work on the corporate network
- WebSocket testing requires either Cloudflare deployment or home network
- Git, GitHub CLI (`gh`), Node.js, and wrangler are all installed
- GitHub auth uses the `workflow` scope (needed for pushing workflow files)
