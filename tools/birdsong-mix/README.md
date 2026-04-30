# birdsong-mix

Builds a 60-minute MP3 of gently mixed birdsong layered over a continuous
forest-ambience bed, with quiet public-domain classical music drifting in
and out.

This tool lives inside the PhonicPhlip repo for convenience but is
otherwise unrelated to it. The output MP3 is gitignored.

## Requirements

- Python 3.9+
- `ffmpeg` and `ffprobe` on `PATH`
- A free [Freesound](https://freesound.org/) API token if you want auto-fetch
  of CC0 ambience and bird fallback. Set `FREESOUND_TOKEN` in the environment.

```
pip install -r requirements.txt
```

## Sources & licensing

| Layer       | Auto-fetched from                                                | License filter                |
|-------------|------------------------------------------------------------------|-------------------------------|
| Birds       | [xeno-canto](https://xeno-canto.org/) JSON API (no token needed) | CC-BY / CC-BY-SA / PD only    |
| Birds (fb)  | Freesound API (`FREESOUND_TOKEN`)                                | CC0 only                      |
| Ambience    | Freesound API (`FREESOUND_TOKEN`)                                | CC0 only                      |
| Classical   | Manual drop into `input/classical/`                              | Public-domain recordings only |

`fetch.py` writes a `manifest.json` with `{filename, source_url, author,
license, sha256}` for every asset and `licenses.py` refuses anything outside
the whitelist (`CC0`, `PDM`, `CC-BY-4.0`, `CC-BY-SA-4.0`).
`ATTRIBUTION.md` is regenerated from `manifest.json` on every build.

You can drop your own files into `input/{birds,ambience,classical}/`. If a
layer's `input/` is non-empty, auto-fetch is skipped for that layer. Each
override file needs a sidecar `<filename>.license.json` with at least
`{"license": "CC0", "author": "...", "source_url": "..."}`.

## Run

```bash
export FREESOUND_TOKEN=...   # only if you want auto-fetched ambience/birds
python -m birdsong_mix fetch
python -m birdsong_mix build
python -m birdsong_mix verify build/birdsong-60min.mp3
```

`build/birdsong-60min.mp3` is the artifact. Same `seed` in `config.yaml`
plus the same `manifest.json` produces a bit-identical mix (modulo ffmpeg
version).

## Tweaking the mix

All knobs live in `config.yaml`:

- `seed` — change this for a different arrangement
- `ambience.gain_db`, `classical.gain_db`, `birds.gain_jitter_db` — levels
- `classical.block_min_s` / `block_max_s` / `gap_min_s` / `gap_max_s` —
  how often classical drifts in
- `birds.event_count_min` / `event_count_max` — bird density
- `loudnorm.i` — overall loudness (more negative = quieter)
- `species` — which xeno-canto species to draw from
