# PhonicPhlip

A split-flap train departure board that teaches phonics. Built for a reception-aged child learning to read, displayed on a wall-mounted TV via Raspberry Pi, controlled from a phone.

Built on [FlipOff](https://github.com/magnum6actual/flipoff) by magnum6actual (MIT licence).

**Live demo:** [phonic-phlip.lawrencedejuwiseman.workers.dev](https://phonic-phlip.lawrencedejuwiseman.workers.dev)

## What it does

A full-screen split-flap departure board with a ticking clock and four departure rows. Every destination is a strictly decodable word appropriate for Phase 3/4 phonics readers. The board generates random departures with phonics-aware station names, optional digraph words (sh, ch, th, oo, ee), and compound names with decodable suffixes (TOWN, HALT, PARK, etc.).

A phone control page lets you generate new departures, enter custom destinations, and adjust settings (clock format, word length, digraph frequency, letter case, auto-refresh) without touching the display.

## Quick start

### Hosted version (easiest)

Open [phonic-phlip.lawrencedejuwiseman.workers.dev](https://phonic-phlip.lawrencedejuwiseman.workers.dev) on any device. Open [/control](https://phonic-phlip.lawrencedejuwiseman.workers.dev/control) on your phone to control it. WebSocket relay connects the two pages automatically.

### Local server (for development or Pi)

```
pip install aiohttp
python server.py
```

Display: http://localhost:8080
Control: http://localhost:8080/control (use your machine's IP address from a phone on the same WiFi)

### Raspberry Pi setup

```
cd ~/PhonicPhlip
chmod +x setup-pi.sh
./setup-pi.sh
```

The Pi auto-starts the server and opens the display in Chromium kiosk mode on boot.

## Keyboard shortcuts

- **Space / Enter / Right arrow** — new departures
- **F** — toggle fullscreen
- **M** — toggle sound mute
- **Double-click** — toggle fullscreen

## Phone control

- **New Departures** — random phonics-aware departures
- **Custom departure** — type your own destination, time, platform
- **Settings** — clock format (12h/24h), seconds, letter case (CAPS/Title), max word length (3-7), digraph frequency, suffix frequency, auto-refresh interval, max platform number
- **Digraph toggles** — enable/disable sh, ch, th, oo, ee individually

## Phonics design

All destinations are strictly decodable at Phase 3/4 pink level:

- No silent letters (no "Thame", no "Vale", no "Gate")
- No exception words or irregular pronunciations
- No function words as destinations
- Words sound plausible as UK station names

Word types: CVC core words (PEN, HULL, DOG), digraph words used sparingly (SHAW, BATH, POOL), compound names with decodable suffixes (DOG TOWN, ASH HALT). Casing toggles between ALL CAPS and Title Case for lowercase letter recognition.

## Deployment

The hosted version runs on Cloudflare Workers (free tier). Static files served from CDN edge, WebSocket relay via a Durable Object. Deploy with:

```
npm install
npx wrangler login
npx wrangler deploy
```

## File structure

```
index.html              Display page (TV)
control/index.html      Phone control page
css/board.css           Departure board layout, clock, responsive sizing
css/tile.css            Split-flap tile styling and animation
css/reset.css           CSS reset
js/config.js            Word bank, animation settings, default config
js/DepartureBoard.js    Clock + departure rows, manages all tile groups
js/WordBank.js          Phonics-aware random departure generator
js/Tile.js              Individual tile scramble/flip animation
js/TileRow.js           Horizontal strip of tiles
js/SoundEngine.js       Web Audio API mechanical flap sound
js/flapAudio.js         Base64-encoded audio data
js/main.js              Entry point: display, WebSocket client, keyboard controls
server.py               Python aiohttp server (local/Pi use)
setup-pi.sh             Raspberry Pi auto-setup script
src/worker.js           Cloudflare Worker entry point
src/relay.js            Cloudflare Durable Object WebSocket relay
wrangler.toml           Cloudflare Workers configuration
```

## Licence

MIT (FlipOff) + MIT (modifications).
