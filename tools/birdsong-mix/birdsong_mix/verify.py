"""Sanity-check the rendered MP3: duration window + integrated loudness."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path


SPOT_CHECK_TIMESTAMPS = ("00:03", "00:17", "00:31", "00:44", "00:58")


def _ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def _measure_loudness(path: Path) -> dict[str, float]:
    """Run ebur128 and parse the summary block."""
    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-nostats",
            "-i", str(path),
            "-af", "ebur128=peak=true",
            "-f", "null", "-",
        ],
        capture_output=True, text=True, check=False,
    )
    text = proc.stderr
    out: dict[str, float] = {}
    for key, pattern in (
        ("integrated_lufs", r"I:\s+(-?\d+\.\d+)\s+LUFS"),
        ("loudness_range", r"LRA:\s+(-?\d+\.\d+)\s+LU"),
        ("true_peak_dbtp", r"Peak:\s+(-?\d+\.\d+)\s+dBFS"),
    ):
        m = re.search(pattern, text)
        if m:
            out[key] = float(m.group(1))
    return out


def run(tool_root: Path, mp3_path: Path | None = None) -> int:
    if mp3_path is None:
        mp3_path = tool_root / "build" / "birdsong-60min.mp3"
    if not mp3_path.exists():
        print(f"ERROR: {mp3_path} does not exist")
        return 2

    failures: list[str] = []

    duration = _ffprobe_duration(mp3_path)
    print(f"duration: {duration:.2f} s")
    if not (3595 <= duration <= 3605):
        failures.append(f"duration {duration:.2f}s outside [3595, 3605]")

    loud = _measure_loudness(mp3_path)
    if "integrated_lufs" in loud:
        i = loud["integrated_lufs"]
        print(f"integrated loudness: {i:.1f} LUFS")
        if not (-22.0 <= i <= -18.0):
            failures.append(f"integrated loudness {i:.1f} LUFS outside [-22, -18]")
    else:
        failures.append("could not parse integrated loudness from ffmpeg output")

    if "true_peak_dbtp" in loud:
        tp = loud["true_peak_dbtp"]
        print(f"true peak: {tp:.2f} dBTP")
        if tp > -1.0:
            failures.append(f"true peak {tp:.2f} dBTP exceeds -1.0")

    if "loudness_range" in loud:
        print(f"loudness range: {loud['loudness_range']:.1f} LU")

    print("")
    print("spot-check timestamps (scrub to these and listen):")
    for ts in SPOT_CHECK_TIMESTAMPS:
        print(f"  {ts}")
    print("checklist:")
    print("  [ ] forest bed audible the entire time, never silent")
    print("  [ ] classical drifts in and out, never abrupt")
    print("  [ ] birds feel spaced and natural, not stacked")
    print("  [ ] no clicks or pops at fade boundaries")

    if failures:
        print("")
        print("FAIL:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("")
    print("OK")
    return 0
