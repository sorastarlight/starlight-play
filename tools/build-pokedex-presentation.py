#!/usr/bin/env python3
"""Build Pokédex presentation assets + visible-alpha bounds metadata.

Priority (Pokédex presentation only — does NOT touch encounter sprites):
  1. Pokémon HOME (PokeAPI sprites repo)
  2. Official Artwork
  3. Local form/battle GIF
  4. Stadium2 last-resort fallback

Assets are cached under images/pokemon/home/ and images/pokemon/official-artwork/.
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


def opaque_bounds(im: Image.Image) -> tuple[int, int, int, int] | None:
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda a: 255 if a > ALPHA_CUTOFF else 0)
    box = mask.getbbox()
    if not box:
        return None
    x0, y0, x1, y1 = box
    return (x0, y0, x1 - x0, y1 - y0)


def best_frame(im: Image.Image) -> Image.Image:
    n = getattr(im, "n_frames", 1)
    best = None
    best_score = -1
    for i in range(n):
        try:
            im.seek(i)
        except EOFError:
            break
        frame = im.convert("RGBA")
        alpha = frame.getchannel("A")
        score = sum(1 for a in alpha.getdata() if a > ALPHA_CUTOFF)
        if score > best_score:
            best_score = score
            best = frame.copy()
    return best or im.convert("RGBA")


def analyze_image(im: Image.Image) -> dict:
    w, h = im.size
    bounds = opaque_bounds(im) or (0, 0, w, h)
    return {"w": w, "h": h, "bounds": list(bounds)}


def write_png(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)


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


def load_image(path: Path) -> Image.Image | None:
    if not path.exists():
        return None
    try:
        im = Image.open(path)
        return best_frame(im) if path.suffix.lower() == ".gif" else im.convert("RGBA")
    except Exception as exc:
        print("skip", path, exc, file=sys.stderr)
        return None


def find_gif(base: Path, dex: int) -> Path | None:
    direct = base / f"{dex}.gif"
    if direct.exists():
        return direct
    hits = list(base.rglob(f"{dex}.gif")) if base.exists() else []
    return hits[0] if hits else None


def battle_paths(dex: int, form_id: int | None = None, shiny: bool = False, female: bool = False) -> list[Path]:
    if form_id and form_id != dex:
        root = LIVE / "forms"
        parts = []
        if shiny:
            parts.append("shiny")
        if female:
            parts.append("female")
        folder = root.joinpath(*parts) if parts else root
        return [folder / f"{form_id}.gif", folder / f"{form_id}.png"]
    if shiny and female:
        return [LIVE / "shiny" / "female" / f"{dex}.gif"]
    if female:
        return [LIVE / "female" / f"{dex}.gif"]
    if shiny:
        return [LIVE / "shiny" / f"{dex}.gif"]
    return [LIVE / f"{dex}.gif"]


def load_first(paths: list[Path]) -> tuple[Path, Image.Image] | None:
    for p in paths:
        im = load_image(p)
        if im is not None:
            return p, im
    return None


def sync_remote(kind: str, pid: int, shiny: bool = False) -> Path | None:
    """kind: home | official-artwork. Returns local path if present/fetched."""
    base = HOME_OUT if kind == "home" else OA_OUT
    rel = f"{'shiny/' if shiny else ''}{pid}.png"
    dest = base / rel
    url = f"{RAW}/{kind}/{'shiny/' if shiny else ''}{pid}.png"
    if fetch_url(url, dest):
        return dest
    if dest.exists() and dest.stat().st_size < 200:
        dest.unlink(missing_ok=True)
    return None


def resolve_base(dex: int, shiny: bool = False) -> tuple[str, Path, Image.Image] | None:
    for kind, cls in (("home", "home"), ("official-artwork", "official-artwork")):
        path = sync_remote(kind, dex, shiny=shiny)
        if path:
            im = load_image(path)
            if im is not None:
                return cls, path, im
    hit = load_first(battle_paths(dex, shiny=shiny))
    if hit:
        return "battle", hit[0], hit[1]
    if not shiny:
        stad = find_gif(STAD_N, dex)
        if stad:
            im = load_image(stad)
            if im is not None:
                return "stadium2", stad, im
    else:
        stad = find_gif(STAD_S, dex)
        if stad:
            im = load_image(stad)
            if im is not None:
                return "stadium2", stad, im
    return None


def resolve_form(dex: int, form_id: int, shiny: bool = False) -> tuple[str, Path, Image.Image] | None:
    for kind, cls in (("home", "home"), ("official-artwork", "official-artwork")):
        path = sync_remote(kind, form_id, shiny=shiny)
        if path:
            im = load_image(path)
            if im is not None:
                return cls, path, im
    hit = load_first(battle_paths(dex, form_id=form_id, shiny=shiny))
    if hit:
        return "battle", hit[0], hit[1]
    return None


def public_url(path: Path) -> str:
    try:
        rel = path.relative_to(ROOT).as_posix()
    except ValueError:
        rel = path.as_posix()
    return rel


def entry_from(cls: str, path: Path, im: Image.Image) -> dict:
    meta = analyze_image(im)
    render = "pixelated" if cls == "battle" else "auto"
    # If we loaded from outside live tree (stadium), copy into home fallbacks folder
    url_path = path
    if not str(path).replace("\\", "/").startswith(str(LIVE).replace("\\", "/")):
        # stadium last-resort: copy into images/pokemon/home/_fallback/
        dest = HOME_OUT / "_fallback" / path.name.replace(".gif", ".png")
        write_png(im, dest)
        url_path = dest
    elif path.suffix.lower() == ".gif" and cls != "battle":
        # shouldn't happen for home/oa
        pass
    return {
        "class": cls,
        "render": render,
        "url": public_url(url_path) if cls != "battle" or path.suffix.lower() != ".gif" else public_url(path),
        "w": meta["w"],
        "h": meta["h"],
        "bounds": meta["bounds"],
    }


def prefetch_ids(ids: list[int]) -> None:
    jobs = []
    for pid in ids:
        jobs.append(("home", pid, False))
        jobs.append(("home", pid, True))
        jobs.append(("official-artwork", pid, False))
        jobs.append(("official-artwork", pid, True))

    def work(item):
        kind, pid, shiny = item
        return kind, pid, shiny, sync_remote(kind, pid, shiny=shiny) is not None

    ok = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for i, result in enumerate(pool.map(work, jobs), 1):
            kind, pid, shiny, success = result
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
    print(f"syncing HOME/OA for {len(all_ids)} ids…")
    prefetch_ids(all_ids)

    assets: dict[str, dict] = {}
    counts = {"home": 0, "official-artwork": 0, "battle": 0, "stadium2": 0}

    for dex in KANTO:
        resolved = resolve_base(dex, shiny=False)
        if not resolved:
            print("MISSING base", dex, file=sys.stderr)
            continue
        cls, path, im = resolved
        entry = entry_from(cls, path, im)
        # Prefer serving from home/oa folders with stable URLs
        if cls == "home":
            entry["url"] = f"images/pokemon/home/{dex}.png"
        elif cls == "official-artwork":
            entry["url"] = f"images/pokemon/official-artwork/{dex}.png"
        counts[cls] = counts.get(cls, 0) + 1

        shiny = resolve_base(dex, shiny=True)
        if shiny:
            scls, spath, sim = shiny
            sm = analyze_image(sim)
            if scls == "home":
                entry["shinyUrl"] = f"images/pokemon/home/shiny/{dex}.png"
            elif scls == "official-artwork":
                entry["shinyUrl"] = f"images/pokemon/official-artwork/shiny/{dex}.png"
            else:
                entry["shinyUrl"] = public_url(spath)
            entry["shiny"] = {"w": sm["w"], "h": sm["h"], "bounds": sm["bounds"], "class": scls}

        # battle fallback metadata for female / missing shiny cases
        bhit = load_first(battle_paths(dex))
        if bhit:
            bm = analyze_image(bhit[1])
            entry["battleFallback"] = {
                "class": "battle",
                "render": "pixelated",
                "url": public_url(bhit[0]),
                "w": bm["w"],
                "h": bm["h"],
                "bounds": bm["bounds"],
            }
        fhit = load_first(battle_paths(dex, female=True))
        if fhit:
            fm = analyze_image(fhit[1])
            entry["female"] = {
                "class": "battle",
                "render": "pixelated",
                "url": public_url(fhit[0]),
                "w": fm["w"],
                "h": fm["h"],
                "bounds": fm["bounds"],
            }
        assets[str(dex)] = entry
        if dex % 25 == 0:
            print(f"base {dex}/151 class={cls}")

    for form_id in form_ids:
        dex = form_to_dex[form_id]
        resolved = resolve_form(dex, form_id, shiny=False)
        if not resolved:
            continue
        cls, path, im = resolved
        entry = entry_from(cls, path, im)
        if cls == "home":
            entry["url"] = f"images/pokemon/home/{form_id}.png"
        elif cls == "official-artwork":
            entry["url"] = f"images/pokemon/official-artwork/{form_id}.png"
        shiny = resolve_form(dex, form_id, shiny=True)
        if shiny:
            scls, spath, sim = shiny
            sm = analyze_image(sim)
            if scls == "home":
                entry["shinyUrl"] = f"images/pokemon/home/shiny/{form_id}.png"
            elif scls == "official-artwork":
                entry["shinyUrl"] = f"images/pokemon/official-artwork/shiny/{form_id}.png"
            else:
                entry["shinyUrl"] = public_url(spath)
            entry["shiny"] = {"w": sm["w"], "h": sm["h"], "bounds": sm["bounds"], "class": scls}
        assets[f"{dex}:{form_id}"] = entry
        counts[cls] = counts.get(cls, 0) + 1

    payload = {
        "version": 2,
        "envelope": {"occupancyH": 0.78, "occupancyW": 0.86, "margin": 0.05},
        "priority": ["home", "official-artwork", "battle", "stadium2"],
        "assets": assets,
    }
    OUT_JS.write_text(
        "/* generated by tools/build-pokedex-presentation.py — data only */\n"
        f"window.PLAY_POKEDEX_PRESENTATION = {json.dumps(payload, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print("wrote", OUT_JS, "keys", len(assets), "counts", counts)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
