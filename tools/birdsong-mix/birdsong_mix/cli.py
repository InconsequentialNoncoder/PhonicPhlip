"""birdsong_mix command-line entry point."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

from . import arrange, fetch, render, verify


def _tool_root() -> Path:
    # the package lives at <tool_root>/birdsong_mix/, so its parent is the tool root
    return Path(__file__).resolve().parent.parent


def _load_config(tool_root: Path) -> dict:
    return yaml.safe_load((tool_root / "config.yaml").read_text())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="birdsong_mix",
        description="Build a 60-min ambient birdsong mix.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("fetch", help="download CC0/PD sources, write manifest.json")
    sub.add_parser("arrange", help="build events.json from manifest + config")
    p_build = sub.add_parser("build", help="fetch + arrange + render")
    p_build.add_argument("--dry-run", action="store_true", help="print ffmpeg cmd, don't run")
    p_build.add_argument("--skip-fetch", action="store_true", help="reuse existing manifest.json")
    p_verify = sub.add_parser("verify", help="check duration + loudness of an MP3")
    p_verify.add_argument("path", nargs="?", help="path to MP3 (default: build/birdsong-60min.mp3)")

    args = parser.parse_args(argv)
    root = _tool_root()
    config = _load_config(root)

    if args.cmd == "fetch":
        fetch.run(root, config)
        return 0

    if args.cmd == "arrange":
        arrange.run(root, config)
        return 0

    if args.cmd == "build":
        if not args.skip_fetch:
            fetch.run(root, config)
        arrange.run(root, config)
        render.run(root, config, dry_run=args.dry_run)
        return 0

    if args.cmd == "verify":
        path = Path(args.path) if args.path else None
        return verify.run(root, path)

    return 2


if __name__ == "__main__":
    sys.exit(main())
