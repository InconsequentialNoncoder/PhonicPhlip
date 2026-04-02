# PhonicPhlip

A split-flap train departure board that teaches phonics. Built for a reception-aged child learning to read, displayed on a wall-mounted TV via Raspberry Pi, controlled from a phone.

Built on [FlipOff](https://github.com/magnum6actual/flipoff) by magnum6actual (MIT licence).
<img width="1536" height="620" alt="image" src="https://github.com/user-attachments/assets/57dbdb33-8d34-4fdc-afe7-2b87a1752be8" />
<img width="513" height="602" alt="image" src="https://github.com/user-attachments/assets/f8b9c78e-6613-4d61-8cbc-c021572756e3" />
<img width="517" height="686" alt="image" src="https://github.com/user-attachments/assets/c8ded701-ef34-4a3f-b31c-18a2d551e239" />

## What it does

A full-screen split-flap departure board with a ticking clock and four departure rows. Every destination is a strictly decodable word appropriate for Phase 3/4 phonics readers. The board generates random departures with phonics-aware station names, optional digraph words (sh, ch, th, oo, ee), and compound names with decodable suffixes (TOWN, HALT, PARK, etc.).

A phone control page lets you generate new departures, enter custom destinations, and adjust settings (clock format, word length, digraph frequency, letter case, auto-refresh) without touching the display.

## Quick start

### Hosted version (easiest)

Open [phonic-phlip.inconsequentialnoncoder.workers.dev](https://phonic-phlip.inconsequentialnoncoder.workers.dev) on any device. Open [/control](https://phonic-phlip.inconsequentialnoncoder.workers.dev/control) on your phone to control it. WebSocket relay connects the two pages automatically.

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

## Sessions

By default the board runs in guest mode — open it and go. For persistent, shareable sessions:

1. Click **Sync** (display page, top-right) or use the session bar (control page)
2. Enter an identifier (e.g. "smith-family", "classroom-3")
3. Click **Connect**

Your settings are saved server-side and restored when you reconnect with the same identifier. Multiple devices with the same identifier share one board. Click **Disconnect** to return to guest mode.

## Keyboard shortcuts

- **Space / Enter / Right arrow** — new departures
- **F** — toggle fullscreen
- **M** — toggle sound mute
- **Double-click** — toggle fullscreen

## Phone control

- **New Departures** — random phonics-aware departures
- **Custom departure** — type your own destination, time, platform
- **Settings** — clock format (12h/24h), seconds, letter case (CAPS/Title), suffix frequency, auto-refresh interval, max platform number, refresh-on-change toggle
- **Phase toggles** — enable/disable phonics phases 2, 3, 4, 5a, 5b, 6a, 6b, 6c independently
- **Digraph toggles** — enable/disable all 14 Phase 3 digraphs individually (ch, sh, th, ng, ai, ee, oa, oo, ar, or, ur, ow, oi, er)
- **Trigraph toggles** — enable/disable all 4 Phase 3 trigraphs individually (igh, air, ear, ure)

## Phonics design

The word bank contains ~240 words across 8 groups aligned to the UK Letters and Sounds curriculum (Phases 2-6). All words are strictly decodable at or before their stated phase level. No silent letters, no exception words, no irregular pronunciations.

**Phase 2:** Simple CVC words (PIT, DEN, HILL, BECK)
**Phase 3:** Digraph/trigraph words (MARSH, CHURCH, MOON, HIGH)
**Phase 4:** Consonant cluster words (GLEN, FROST, SPRING, STREAM)
**Phase 5a:** Split digraphs and new vowel spellings (LAKE, STONE, GROVE, DUNE)
**Phase 5b:** Alternative pronunciations (BRIDGE, KNOLL, WILD, GRANGE)
**Phase 6a-c:** Two-syllable, compound, and multi-syllabic words (MEADOW, MOONBEAM, WHISPERING)

Parents toggle phases on/off to match the child's current level. Individual digraph and trigraph toggles provide fine-grained control over which sounds appear. Suffixes (TOWN, HALT, PARK, etc.) are added to single-syllable words only. Casing toggles between ALL CAPS and Title Case for lowercase letter recognition.

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
js/session.js           Session management (localStorage + WebSocket URL building)
js/main.js              Entry point: display, WebSocket client, keyboard controls
server.py               Python aiohttp server (local/Pi use)
setup-pi.sh             Raspberry Pi auto-setup script
src/worker.js           Cloudflare Worker entry point
src/relay.js            Cloudflare Durable Object WebSocket relay
wrangler.toml           Cloudflare Workers configuration
```

## Licence

MIT (FlipOff) + MIT (modifications).
