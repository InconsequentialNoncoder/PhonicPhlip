"""Build a deterministic, seeded timeline from manifest.json + config.yaml.

Emits events.json: one entry per audible event with start time, gain, pan,
fade and which file plays. The renderer turns this into an ffmpeg graph.
"""
from __future__ import annotations

import json
import random
import subprocess
from pathlib import Path
from typing import Any


def _ffprobe_duration(path: str) -> float:
    """Return duration in seconds via ffprobe. Returns 0.0 if unknown."""
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            text=True,
        ).strip()
        return float(out)
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        return 0.0


def _arrange_ambience(
    files: list[dict],
    duration_s: int,
    cfg: dict[str, Any],
) -> list[dict]:
    """One event per ambience file at t=0, loop_to_end=true. Renderer loops + trims."""
    events: list[dict] = []
    for f in files:
        events.append({
            "bus": "ambience",
            "file": f["filename"],
            "start_s": 0.0,
            "duration_s": duration_s,
            "gain_db": cfg["gain_db"],
            "pan": 0.0,
            "fade_in_s": cfg["fade_in_s"],
            "fade_out_s": cfg["fade_out_s"],
            "loop_to_end": True,
        })
    return events


def _arrange_classical(
    files: list[dict],
    duration_s: int,
    cfg: dict[str, Any],
    rng: random.Random,
) -> list[dict]:
    """Sparse blocks separated by silent gaps."""
    if not files:
        return []
    events: list[dict] = []
    # tail margin so the last block can fade out cleanly
    tail = cfg["fade_out_s"] + 5
    head = cfg["fade_in_s"] + 5
    cursor = float(rng.randint(int(cfg["gap_min_s"]), int(cfg["gap_max_s"])))
    pool = list(files)
    rng.shuffle(pool)
    pi = 0
    while cursor < duration_s - tail:
        block_len = float(rng.uniform(cfg["block_min_s"], cfg["block_max_s"]))
        if cursor + block_len > duration_s - tail:
            block_len = (duration_s - tail) - cursor
            if block_len < cfg["block_min_s"] / 2:
                break
        f = pool[pi % len(pool)]
        pi += 1
        clip_dur = f.get("_dur") or 0.0
        events.append({
            "bus": "classical",
            "file": f["filename"],
            "start_s": round(cursor, 3),
            "duration_s": round(min(block_len, clip_dur or block_len), 3),
            "gain_db": cfg["gain_db"],
            "pan": round(rng.uniform(-0.15, 0.15), 3),
            "fade_in_s": cfg["fade_in_s"],
            "fade_out_s": cfg["fade_out_s"],
            "loop_to_end": False,
        })
        cursor += block_len + rng.uniform(cfg["gap_min_s"], cfg["gap_max_s"])
        cursor += head  # extra breath before the next block
    return events


def _arrange_birds(
    files: list[dict],
    duration_s: int,
    cfg: dict[str, Any],
    rng: random.Random,
) -> list[dict]:
    if not files:
        return []
    n = rng.randint(int(cfg["event_count_min"]), int(cfg["event_count_max"]))
    pool = list(files)
    rng.shuffle(pool)

    # Distribute n events roughly evenly across the hour, then jitter each
    # within its slot so they don't feel grid-aligned.
    slot = (duration_s - 30) / max(n, 1)
    events: list[dict] = []
    for i in range(n):
        f = pool[i % len(pool)]
        clip_dur = f.get("_dur") or 0.0
        if clip_dur <= 0:
            continue
        # play between 8s and min(90s, clip duration). some short calls allowed.
        play_min = min(8.0, max(2.0, clip_dur))
        play_max = min(90.0, max(play_min + 1.0, clip_dur))
        play = float(rng.uniform(play_min, play_max))
        center = i * slot + rng.uniform(0, slot)
        start = max(0.0, center - play / 2)
        if start + play > duration_s - 5:
            continue
        events.append({
            "bus": "birds",
            "file": f["filename"],
            "start_s": round(start, 3),
            "duration_s": round(play, 3),
            "gain_db": round(rng.uniform(-cfg["gain_jitter_db"], cfg["gain_jitter_db"]), 2),
            "pan": round(rng.uniform(-cfg["pan_range"], cfg["pan_range"]), 3),
            "fade_in_s": cfg["fade_in_s"],
            "fade_out_s": cfg["fade_out_s"],
            "loop_to_end": False,
            "species": f.get("species"),
        })
    return events


def run(tool_root: Path, config: dict) -> Path:
    manifest = json.loads((tool_root / "manifest.json").read_text())
    by_layer: dict[str, list[dict]] = {"birds": [], "ambience": [], "classical": []}
    for entry in manifest.get("assets", []):
        layer = entry.get("layer")
        if layer in by_layer:
            entry = dict(entry)
            entry["_dur"] = _ffprobe_duration(entry["filename"])
            by_layer[layer].append(entry)

    rng = random.Random(config["seed"])
    duration_s = int(config["duration_s"])

    events: list[dict] = []
    events += _arrange_ambience(by_layer["ambience"], duration_s, config["ambience"])
    events += _arrange_classical(by_layer["classical"], duration_s, config["classical"], rng)
    events += _arrange_birds(by_layer["birds"], duration_s, config["birds"], rng)

    events.sort(key=lambda e: (e["bus"], e["start_s"]))

    out_path = tool_root / "build" / "events.json"
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps({
        "duration_s": duration_s,
        "seed": config["seed"],
        "events": events,
    }, indent=2))

    by_bus: dict[str, int] = {}
    for e in events:
        by_bus[e["bus"]] = by_bus.get(e["bus"], 0) + 1
    print(f"arranged: {out_path}")
    for bus, n in sorted(by_bus.items()):
        print(f"  {bus}: {n} event(s)")
    return out_path
