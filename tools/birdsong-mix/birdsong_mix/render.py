"""Render the timeline to an MP3 via a single ffmpeg filter_complex pass.

Strategy:
- One `-i` per event (ffmpeg handles 100+ inputs fine; memory cost is negligible
  for our short clips).
- ambience events get `-stream_loop -1` so a 5-min forest clip tiles to fill 60.
- Per-event chain: atrim → aformat stereo → volume → pan → afade in/out → apad
  → adelay → label.
- Per-bus amix, then 3-bus amix, then loudnorm + alimiter, then libmp3lame.
- The full filter_complex graph is written to build/filter.txt and passed via
  `-filter_complex_script` to dodge command-line length limits.
"""
from __future__ import annotations

import json
import math
import shlex
import subprocess
from pathlib import Path
from typing import Any


def _equal_power_pan(p: float) -> tuple[float, float]:
    """Equal-power pan. p ∈ [-1, 1]. Returns (L_gain, R_gain)."""
    p = max(-1.0, min(1.0, p))
    angle = (p + 1.0) * math.pi / 4.0
    return math.cos(angle), math.sin(angle)


def _build_event_chain(idx: int, event: dict[str, Any], total_duration_s: int) -> tuple[str, str]:
    """Return (filter_string, output_label) for one event."""
    label_in = f"[{idx}:a]"
    label_out = f"[ev{idx}]"
    parts: list[str] = []

    parts.append("aformat=sample_rates=44100:channel_layouts=stereo")

    dur = float(event["duration_s"])
    parts.append(f"atrim=duration={dur:.3f}")
    parts.append("asetpts=PTS-STARTPTS")

    if event["gain_db"] != 0:
        parts.append(f"volume={event['gain_db']:.2f}dB")

    if abs(event.get("pan", 0.0)) > 0.02:
        L, R = _equal_power_pan(event["pan"])
        parts.append(
            f"pan=stereo|c0={L:.4f}*c0+{L:.4f}*c1|c1={R:.4f}*c0+{R:.4f}*c1"
        )

    fi = float(event.get("fade_in_s", 0))
    fo = float(event.get("fade_out_s", 0))
    if fi > 0:
        parts.append(f"afade=t=in:st=0:d={fi:.3f}")
    if fo > 0 and fo < dur:
        parts.append(f"afade=t=out:st={dur - fo:.3f}:d={fo:.3f}")

    # pad to full timeline length so amix doesn't truncate
    parts.append(f"apad=whole_dur={total_duration_s}")

    start_ms = int(round(float(event["start_s"]) * 1000))
    if start_ms > 0:
        parts.append(f"adelay={start_ms}|{start_ms}")

    chain = ",".join(parts)
    return f"{label_in}{chain}{label_out}", label_out


def _build_graph(events: list[dict], total_duration_s: int) -> tuple[str, list[str], list[str]]:
    """Build the full filter_complex graph.

    Returns (graph_text, input_args, _bus_labels).
    `input_args` is the list of CLI arg tokens (`-stream_loop -1 -i path` or
    `-i path`) in the same order as the events, so input index i matches event i.
    """
    lines: list[str] = []
    input_args: list[str] = []
    bus_outputs: dict[str, list[str]] = {"ambience": [], "classical": [], "birds": []}

    for i, ev in enumerate(events):
        if ev.get("loop_to_end"):
            input_args += ["-stream_loop", "-1", "-i", ev["file"]]
        else:
            input_args += ["-i", ev["file"]]
        chain, label = _build_event_chain(i, ev, total_duration_s)
        lines.append(chain)
        bus_outputs[ev["bus"]].append(label)

    # Per-bus amix. If a bus is empty, emit a silent stand-in so the master
    # amix has the expected three inputs.
    bus_final: list[str] = []
    for bus in ("ambience", "classical", "birds"):
        outs = bus_outputs[bus]
        if not outs:
            silent_label = f"[{bus}_bus]"
            lines.append(
                f"anullsrc=channel_layout=stereo:sample_rate=44100,"
                f"atrim=duration={total_duration_s}{silent_label}"
            )
            bus_final.append(silent_label)
            continue
        joined = "".join(outs)
        out_label = f"[{bus}_bus]"
        lines.append(f"{joined}amix=inputs={len(outs)}:normalize=0:duration=longest{out_label}")
        bus_final.append(out_label)

    # Master mix → loudnorm → limiter → final stereo
    master_in = "".join(bus_final)
    lines.append(
        f"{master_in}amix=inputs=3:normalize=0:duration=longest[mixed]"
    )
    lines.append(
        "[mixed]loudnorm=I=-20:TP=-1.5:LRA=11,alimiter=limit=0.95[out]"
    )
    return ";\n".join(lines), input_args, bus_final


def run(tool_root: Path, config: dict, dry_run: bool = False) -> Path:
    events_path = tool_root / "build" / "events.json"
    payload = json.loads(events_path.read_text())
    events: list[dict] = payload["events"]
    total_duration_s = int(payload["duration_s"])

    if not events:
        raise RuntimeError(
            "no events to render — check that fetch produced a manifest with "
            "ambience/birds assets, or drop files into input/"
        )

    graph, input_args, _ = _build_graph(events, total_duration_s)

    build_dir = tool_root / "build"
    build_dir.mkdir(exist_ok=True)
    filter_script = build_dir / "filter.txt"
    filter_script.write_text(graph)

    out_mp3 = build_dir / "birdsong-60min.mp3"
    bitrate = int(config["bitrate_kbps"])
    sr = int(config["sample_rate"])

    cmd = ["ffmpeg", "-hide_banner", "-y"]
    cmd += input_args
    cmd += [
        "-filter_complex_script", str(filter_script),
        "-map", "[out]",
        "-t", str(total_duration_s),
        "-c:a", "libmp3lame",
        "-b:a", f"{bitrate}k",
        "-ar", str(sr),
        "-ac", "2",
        str(out_mp3),
    ]

    print(f"ffmpeg inputs: {len(events)}")
    print(f"filter graph: {filter_script} ({filter_script.stat().st_size} bytes)")
    if dry_run:
        print("DRY RUN — command would be:")
        print(" ".join(shlex.quote(c) for c in cmd))
        return out_mp3

    print("rendering... (this can take a while; ffmpeg processes the full hour)")
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {result.returncode}")
    print(f"rendered: {out_mp3}")
    return out_mp3
