"""Source fetching: xeno-canto (birds), Freesound (CC0 ambience + bird fallback).

Writes a manifest.json describing every cached/dropped asset.
User overrides in input/<layer>/ skip auto-fetch for that layer.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import requests

from . import licenses

XENO_CANTO_API = "https://www.xeno-canto.org/api/2/recordings"
FREESOUND_API = "https://freesound.org/apiv2"


@dataclass
class Asset:
    layer: str          # "birds" | "ambience" | "classical"
    filename: str       # name on disk (relative to tool root)
    source_url: str
    author: str
    license: str        # canonical form
    sha256: str
    duration_s: float | None = None
    species: str | None = None


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _download(url: str, dest: Path, session: requests.Session) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with session.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        tmp = dest.with_suffix(dest.suffix + ".part")
        with tmp.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                if chunk:
                    f.write(chunk)
        tmp.rename(dest)


def _scan_user_input(layer_dir: Path, layer: str, whitelist: Iterable[str]) -> list[Asset]:
    """Pick up user-supplied files. Each file needs <name>.license.json sidecar."""
    assets: list[Asset] = []
    if not layer_dir.exists():
        return assets
    for path in sorted(layer_dir.iterdir()):
        if path.name.startswith(".") or path.suffix == ".json":
            continue
        sidecar = path.with_suffix(path.suffix + ".license.json")
        if not sidecar.exists():
            sidecar = path.with_name(path.name + ".license.json")
        if not sidecar.exists():
            raise FileNotFoundError(
                f"{path}: missing sidecar {path.name}.license.json with "
                f'{{"license": "...", "author": "...", "source_url": "..."}}'
            )
        meta = json.loads(sidecar.read_text())
        canonical = licenses.assert_allowed(
            meta.get("license", ""), whitelist, context=str(path)
        )
        assets.append(
            Asset(
                layer=layer,
                filename=str(path),
                source_url=meta.get("source_url", ""),
                author=meta.get("author", "unknown"),
                license=canonical,
                sha256=_sha256(path),
            )
        )
    return assets


def fetch_xeno_canto(
    species: list[str],
    per_species: int,
    min_quality: str,
    cache_dir: Path,
    whitelist: Iterable[str],
    session: requests.Session,
) -> list[Asset]:
    """Query xeno-canto per species, filter by license, download up to N each."""
    out: list[Asset] = []
    quality_floor = ord(min_quality.upper())
    for sp in species:
        params = {"query": sp}
        r = session.get(XENO_CANTO_API, params=params, timeout=30)
        r.raise_for_status()
        recordings = r.json().get("recordings", []) or []
        kept = 0
        for rec in recordings:
            if kept >= per_species:
                break
            q = (rec.get("q") or "E").upper()
            if not q or ord(q[0]) > quality_floor:
                continue
            lic_url = rec.get("lic") or ""
            try:
                canonical = licenses.assert_allowed(
                    lic_url, whitelist, context=f"xeno-canto {rec.get('id')}"
                )
            except licenses.LicenseError:
                continue
            file_url = rec.get("file")
            if not file_url:
                continue
            ext = ".mp3"  # xeno-canto serves mp3
            dest = cache_dir / "birds" / f"xc-{rec.get('id')}{ext}"
            if not dest.exists():
                try:
                    _download(file_url, dest, session)
                except requests.HTTPError:
                    continue
            out.append(
                Asset(
                    layer="birds",
                    filename=str(dest),
                    source_url=f"https://xeno-canto.org/{rec.get('id')}",
                    author=rec.get("rec") or "unknown",
                    license=canonical,
                    sha256=_sha256(dest),
                    species=sp,
                )
            )
            kept += 1
    return out


def fetch_freesound(
    query: str,
    layer: str,
    count: int,
    min_duration_s: int | None,
    cache_dir: Path,
    whitelist: Iterable[str],
    session: requests.Session,
    token: str,
) -> list[Asset]:
    """Freesound search for CC0 sounds (oauth/token required)."""
    if not token:
        return []
    headers = {"Authorization": f"Token {token}"}
    filt = 'license:"Creative Commons 0"'
    if min_duration_s:
        filt += f" duration:[{min_duration_s} TO *]"
    params = {
        "query": query,
        "filter": filt,
        "fields": "id,name,username,license,previews,duration,url",
        "page_size": max(count * 2, 8),
    }
    r = session.get(f"{FREESOUND_API}/search/text/", params=params, headers=headers, timeout=30)
    r.raise_for_status()
    results = r.json().get("results", []) or []
    out: list[Asset] = []
    for item in results:
        if len(out) >= count:
            break
        try:
            canonical = licenses.assert_allowed(
                item.get("license", ""), whitelist, context=f"freesound {item.get('id')}"
            )
        except licenses.LicenseError:
            continue
        # the high-quality preview (mp3) is fine for our purposes and doesn't
        # need OAuth2 for download
        preview_url = (item.get("previews") or {}).get("preview-hq-mp3")
        if not preview_url:
            continue
        dest = cache_dir / layer / f"fs-{item.get('id')}.mp3"
        if not dest.exists():
            try:
                _download(preview_url, dest, session)
            except requests.HTTPError:
                continue
        out.append(
            Asset(
                layer=layer,
                filename=str(dest),
                source_url=item.get("url", ""),
                author=item.get("username") or "unknown",
                license=canonical,
                sha256=_sha256(dest),
                duration_s=item.get("duration"),
            )
        )
    return out


def run(tool_root: Path, config: dict) -> Path:
    """Main entry point. Returns path to the written manifest.json."""
    cache_dir = tool_root / "cache"
    input_dir = tool_root / "input"
    cache_dir.mkdir(exist_ok=True)
    whitelist = config["license_whitelist"]
    session = requests.Session()
    session.headers["User-Agent"] = "birdsong-mix/1.0 (PhonicPhlip)"

    assets: list[Asset] = []

    # birds: prefer user input, else xeno-canto, else freesound CC0 fallback
    user_birds = _scan_user_input(input_dir / "birds", "birds", whitelist)
    if user_birds:
        assets.extend(user_birds)
    else:
        xc = fetch_xeno_canto(
            species=config["species"],
            per_species=config["fetch"]["xeno_canto_per_species"],
            min_quality=config["fetch"]["xeno_canto_min_quality"],
            cache_dir=cache_dir,
            whitelist=whitelist,
            session=session,
        )
        assets.extend(xc)
        if not xc:
            fs = fetch_freesound(
                query="birdsong",
                layer="birds",
                count=config["fetch"]["freesound_birds_fallback_count"],
                min_duration_s=None,
                cache_dir=cache_dir,
                whitelist=whitelist,
                session=session,
                token=os.environ.get("FREESOUND_TOKEN", ""),
            )
            assets.extend(fs)

    # ambience: prefer user input, else freesound CC0
    user_amb = _scan_user_input(input_dir / "ambience", "ambience", whitelist)
    if user_amb:
        assets.extend(user_amb)
    else:
        amb = fetch_freesound(
            query="forest ambience",
            layer="ambience",
            count=config["fetch"]["freesound_ambience_count"],
            min_duration_s=config["fetch"]["freesound_ambience_min_duration_s"],
            cache_dir=cache_dir,
            whitelist=whitelist,
            session=session,
            token=os.environ.get("FREESOUND_TOKEN", ""),
        )
        assets.extend(amb)

    # classical: only user-supplied
    user_cl = _scan_user_input(input_dir / "classical", "classical", whitelist)
    assets.extend(user_cl)

    manifest = {"assets": [asdict(a) for a in assets]}
    manifest_path = tool_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))

    licenses.write_attribution(manifest_path, tool_root / "ATTRIBUTION.md")

    by_layer = {}
    for a in assets:
        by_layer[a.layer] = by_layer.get(a.layer, 0) + 1
    print(f"manifest written: {manifest_path}")
    for layer, n in sorted(by_layer.items()):
        print(f"  {layer}: {n} asset(s)")
    if not by_layer.get("ambience"):
        print("  WARNING: no ambience assets — drop a forest file into input/ambience/")
    if not by_layer.get("birds"):
        print("  WARNING: no bird assets")

    return manifest_path
