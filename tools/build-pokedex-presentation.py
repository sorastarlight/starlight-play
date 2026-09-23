#!/usr/bin/env python3
"""Build Pokédex presentation catalog (animated primary + HOME retained).

Priority for LIVE chamber (Pokédex presentation only):
  1. Local animated Showdown/GIF (species/form/shiny/gender)
  2. Pokémon HOME PNG (retained as static/fallback tier)
  3. Official Artwork PNG
  4. Stadium2 LAST RESORT

Does NOT delete HOME/OA files. Does NOT touch encounter/PC sprites.
GIF bounds use a union envelope across animation frames.
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
LIVE = ROOT / "images" / "pokemon"
HOME_OUT = LIVE / "home"
OA_OUT = LIVE / "official-artwork"
STAD_N = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Normal)"
STAD_S = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Shiny)"
OUT_JS = ROOT / "js" / "pokedex-presentation.js"
KANTO = range(1, 152)
ALPHA_CUTOFF = 8
UA = "StarlightPlay-PokedexSync/1.0 (local build cache; not browser runtime)"
RAW = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other"


def public_url(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def opaque_bounds(im: Image.Image) -> tuple[int, int, int, int] | None:
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda a: 255 if a > ALPHA_CUTOFF else 0)
    box = mask.getbbox()
    if not box:
        return None
    x0, y0, x1, y1 = box
    return (x0, y0, x1 - x0, y1 - y0)


def union_bounds(boxes: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int] | None:
    if not boxes:
        return None
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[0] + b[2] for b in boxes)
    y1 = max(b[1] + b[3] for b in boxes)
    return (x0, y0, x1 - x0, y1 - y0)


def analyze_still(im: Image.Image) -> dict:
    w, h = im.size
    bounds = opaque_bounds(im) or (0, 0, w, h)
    return {"w": w, "h": h, "bounds": list(bounds), "frameCount": 1}


def analyze_gif(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        im = Image.open(path)
    except Exception as exc:
        print("skip gif", path, exc, file=sys.stderr)
        return None
    w, h = im.size
    n = getattr(im, "n_frames", 1) or 1
    boxes: list[tuple[int, int, int, int]] = []
    # Cap frame sampling for huge GIFs but prefer full scan when reasonable
    step = 1 if n <= 80 else max(1, n // 60)
    for i in range(0, n, step):
        try:
            im.seek(i)
        except EOFError:
            break
        box = opaque_bounds(im)
        if box:
            boxes.append(box)
    # Always include first + last frame
    for i in (0, n - 1):
        try:
            im.seek(i)
            box = opaque_bounds(im)
            if box:
                boxes.append(box)
        except EOFError:
            pass
    bounds = union_bounds(boxes) or (0, 0, w, h)
    return {
        "w": w,
        "h": h,
        "bounds": list(bounds),
        "frameCount": n,
        "class": "battle",
        "render": "pixelated",
        "url": public_url(path),
    }


def load_png_meta(path: Path) -> dict | None:
    if not path.exists() or path.stat().st_size < 200:
        return None
    try:
        im = Image.open(path).convert("RGBA")
    except Exception as exc:
        print("skip png", path, exc, file=sys.stderr)
        return None
    meta = analyze_still(im)
    return meta


def fetch_url(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 200:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read()
        if len(data) < 200 or data[:4] != b"\x89PNG":
            return False
        dest.write_bytes(data)
        return True
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        return False


def sync_remote(kind: str, pid: int, shiny: bool = False) -> Path | None:
    base = HOME_OUT if kind == "home" else OA_OUT
    rel = f"{'shiny/' if shiny else ''}{pid}.png"
    dest = base / rel
    url = f"{RAW}/{kind}/{'shiny/' if shiny else ''}{pid}.png"
    if fetch_url(url, dest):
        return dest
    if dest.exists() and dest.stat().st_size < 200:
        dest.unlink(missing_ok=True)
    return None


def find_gif(base: Path, dex: int) -> Path | None:
    direct = base / f"{dex}.gif"
    if direct.exists():
        return direct
    hits = list(base.rglob(f"{dex}.gif")) if base.exists() else []
    return hits[0] if hits else None


def battle_gif_path(dex: int, form_id: int | None = None, shiny: bool = False, female: bool = False) -> Path | None:
    if form_id and form_id != dex:
        root = LIVE / "forms"
        parts: list[str] = []
        if shiny:
            parts.append("shiny")
        if female:
            parts.append("female")
        folder = root.joinpath(*parts) if parts else root
        p = folder / f"{form_id}.gif"
        return p if p.exists() else None
    if shiny and female:
        p = LIVE / "shiny" / "female" / f"{dex}.gif"
        return p if p.exists() else None
    if female:
        p = LIVE / "female" / f"{dex}.gif"
        return p if p.exists() else None
    if shiny:
        p = LIVE / "shiny" / f"{dex}.gif"
        return p if p.exists() else None
    p = LIVE / f"{dex}.gif"
    return p if p.exists() else None


def tier_meta(kind: str, pid: int, shiny: bool = False) -> dict | None:
    """HOME or OA still metadata (files retained even when not primary)."""
    base = HOME_OUT if kind == "home" else OA_OUT
    path = base / f"{'shiny/' if shiny else ''}{pid}.png"
    if not path.exists():
        sync_remote(kind, pid, shiny=shiny)
    meta = load_png_meta(path)
    if not meta:
        return None
    url = f"images/pokemon/{'home' if kind == 'home' else 'official-artwork'}/{'shiny/' if shiny else ''}{pid}.png"
    return {
        "class": kind,
        "render": "auto",
        "url": url,
        "w": meta["w"],
        "h": meta["h"],
        "bounds": meta["bounds"],
    }


def stadium_gif(dex: int, shiny: bool = False) -> dict | None:
    root = STAD_S if shiny else STAD_N
    path = find_gif(root, dex)
    if not path:
        return None
    # Copy last-resort still into local fallback so runtime stays local
    try:
        im = Image.open(path)
        im.seek(0)
        frame = im.convert("RGBA")
    except Exception:
        return None
    dest = HOME_OUT / "_fallback" / f"{'shiny-' if shiny else ''}{dex}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.save(dest, format="PNG", optimize=True)
    meta = analyze_still(frame)
    # Prefer analyzing the GIF itself for envelope if readable from STAD path — but runtime URL must be local.
    # Use still bounds from frame 1 as last resort (stadium rarely used).
    return {
        "class": "stadium2",
        "render": "pixelated",
        "url": public_url(dest),
        "w": meta["w"],
        "h": meta["h"],
        "bounds": meta["bounds"],
        "frameCount": 1,
    }


def build_variant(dex: int, form_id: int | None = None, shiny: bool = False, female: bool = False) -> dict | None:
    pid = form_id if form_id and form_id != dex else dex
    animated = None
    gif = battle_gif_path(dex, form_id=form_id, shiny=shiny, female=female)
    if gif:
        animated = analyze_gif(gif)

    home = tier_meta("home", pid, shiny=shiny)
    oa = tier_meta("official-artwork", pid, shiny=shiny)

    primary = animated
    if not primary and home:
        primary = {**home, "frameCount": 1}
    if not primary and oa:
        primary = {**oa, "frameCount": 1}
    if not primary and not form_id:
        primary = stadium_gif(dex, shiny=shiny)

    if not primary:
        return None

    entry = {
        "class": primary["class"],
        "render": primary.get("render", "auto"),
        "url": primary["url"],
        "w": primary["w"],
        "h": primary["h"],
        "bounds": primary["bounds"],
        "frameCount": primary.get("frameCount", 1),
    }
    if animated:
        entry["animatedAsset"] = {
            "class": "battle",
            "render": "pixelated",
            "url": animated["url"],
            "w": animated["w"],
            "h": animated["h"],
            "bounds": animated["bounds"],
            "frameCount": animated["frameCount"],
        }
    if home:
        entry["homeAsset"] = home
    if oa:
        entry["officialArtworkAsset"] = oa
    return entry


def prefetch_still_ids(ids: list[int]) -> None:
    jobs = []
    for pid in ids:
        for kind in ("home", "official-artwork"):
            jobs.append((kind, pid, False))
            jobs.append((kind, pid, True))

    def work(item):
        kind, pid, shiny = item
        return sync_remote(kind, pid, shiny=shiny) is not None

    ok = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for i, success in enumerate(pool.map(work, jobs), 1):
            if success:
                ok += 1
            if i % 100 == 0:
                print(f"prefetch {i}/{len(jobs)} ok={ok}")
    print(f"prefetch done ok={ok}/{len(jobs)}")


def main() -> int:
    forms_js = (ROOT / "js" / "forms.js").read_text(encoding="utf-8", errors="ignore")
    pairs = re.findall(r'"formId"\s*:\s*(\d+)\s*,\s*"dex"\s*:\s*(\d+)', forms_js)
    form_to_dex = {int(fid): int(dex) for fid, dex in pairs if int(dex) <= 151}
    form_ids = sorted({fid for fid, dex in form_to_dex.items() if fid != dex})

    all_ids = sorted(set(KANTO) | set(form_ids))
    print(f"ensuring HOME/OA stills for {len(all_ids)} ids (retained catalog)…")
    prefetch_still_ids(all_ids)

    assets: dict[str, dict] = {}
    counts: dict[str, int] = {}

    for dex in KANTO:
        entry = build_variant(dex)
        if not entry:
            print("MISSING base", dex, file=sys.stderr)
            continue
        shiny = build_variant(dex, shiny=True)
        if shiny:
            entry["shinyUrl"] = shiny["url"]
            entry["shiny"] = {
                "w": shiny["w"],
                "h": shiny["h"],
                "bounds": shiny["bounds"],
                "class": shiny["class"],
                "render": shiny["render"],
                "frameCount": shiny.get("frameCount", 1),
            }
            if shiny.get("animatedAsset"):
                entry["shiny"]["animatedAsset"] = shiny["animatedAsset"]
            if shiny.get("homeAsset"):
                entry["shiny"]["homeAsset"] = shiny["homeAsset"]
        female = build_variant(dex, female=True)
        if female:
            entry["female"] = {
                "class": female["class"],
                "render": female["render"],
                "url": female["url"],
                "w": female["w"],
                "h": female["h"],
                "bounds": female["bounds"],
                "frameCount": female.get("frameCount", 1),
            }
        # Keep battleFallback alias for older resolve paths
        if entry.get("animatedAsset"):
            entry["battleFallback"] = entry["animatedAsset"]
        assets[str(dex)] = entry
        counts[entry["class"]] = counts.get(entry["class"], 0) + 1
        if dex % 25 == 0:
            print(f"base {dex}/151 class={entry['class']} frames={entry.get('frameCount')}")

    for form_id in form_ids:
        dex = form_to_dex[form_id]
        entry = build_variant(dex, form_id=form_id)
        if not entry:
            continue
        shiny = build_variant(dex, form_id=form_id, shiny=True)
        if shiny:
            entry["shinyUrl"] = shiny["url"]
            entry["shiny"] = {
                "w": shiny["w"],
                "h": shiny["h"],
                "bounds": shiny["bounds"],
                "class": shiny["class"],
                "render": shiny["render"],
                "frameCount": shiny.get("frameCount", 1),
            }
            if shiny.get("homeAsset"):
                entry["shiny"]["homeAsset"] = shiny["homeAsset"]
        if entry.get("animatedAsset"):
            entry["battleFallback"] = entry["animatedAsset"]
        assets[f"{dex}:{form_id}"] = entry
        counts[entry["class"]] = counts.get(entry["class"], 0) + 1

    animated_n = sum(1 for a in assets.values() if a.get("animatedAsset") or a.get("class") == "battle")
    home_n = sum(1 for a in assets.values() if a.get("homeAsset"))
    payload = {
        "version": 3,
        "envelope": {"occupancyH": 0.78, "occupancyW": 0.86, "margin": 0.08},
        "priority": ["battle", "home", "official-artwork", "stadium2"],
        "assets": assets,
    }
    OUT_JS.write_text(
        "/* generated by tools/build-pokedex-presentation.py — data only */\n"
        f"window.PLAY_POKEDEX_PRESENTATION = {json.dumps(payload, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print("wrote", OUT_JS, "keys", len(assets), "primary", counts, "animated", animated_n, "homeRetained", home_n)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
