# Departure Board

A split-flap train departure display for phonics and number practice.
Built on [FlipOff](https://github.com/magnum6actual/flipoff) by magnum6actual.

## Quick Start (PC testing)

1. Install Python dependency: `pip install aiohttp`
2. Run: `python server.py`
3. Open http://localhost:8080 in your browser (the display)
4. Open http://localhost:8080/control on your phone (the remote)

Press F for fullscreen. Press Space/Enter for new departures.
Double-click to toggle fullscreen.

## Raspberry Pi Setup

1. Copy this folder to your Pi (e.g. via USB stick to ~/departure-board)
2. Run the setup script:
   ```
   cd ~/departure-board
   chmod +x setup-pi.sh
   ./setup-pi.sh
   ```
3. The Pi will auto-start the server and display on boot.

## Phone Control

Open `http://<pi-ip-address>:8080/control` on your phone.

- **New Departures** — generates random departures from the word bank
- **Custom departure** — type in your own destination, time, platform
- **Settings** — clock format, max word length, digraph frequency, auto-refresh interval
- **Digraph toggles** — enable/disable specific digraphs (sh, ch, th, oo, ee)

## Word Bank

Destinations are phonics-optimised and strictly decodable:
- Core words: CVC and simple patterns (PEN, HULL, FORD, GLEN, BECK...)
- Digraph words: used sparingly based on frequency setting (SHAW, SHOP, BATH, THIN...)

No silent letters. No exception words. No ambiguous pronunciations.

## Files

- `server.py` — Python web server (HTTP + WebSocket)
- `index.html` — TV display page
- `control/index.html` — Phone control page
- `js/config.js` — Word bank, settings, animation config
- `js/DepartureBoard.js` — Clock and departure row management
- `js/WordBank.js` — Phonics-aware random word generator
- `js/Tile.js` — Individual split-flap tile animation
- `js/TileRow.js` — Row of tiles helper
- `js/SoundEngine.js` — Mechanical flap audio
- `js/flapAudio.js` — Embedded audio data
- `setup-pi.sh` — Raspberry Pi auto-setup script

## Licence

MIT (FlipOff) + MIT (modifications).
