#!/usr/bin/env python3
"""Build Pokédex presentation catalog with animated composition / safe-fit metadata.

Live chamber priority (Pokédex presentation only):
  1. Local animated Showdown/GIF
  2. HOME PNG (retained)
  3. Official Artwork PNG
  4. Stadium2 last resort

GIF analysis composites ALL frames (disposal-aware), then derives:
  - union alpha / safe bounds (containment — never crop)
  - core bounds (body prominence)
  - desired core occupancy from canonical height
  - final scale = min(core desire, safe width/height fit)

Does NOT delete HOME/OA. Does NOT touch encounter/PC sprites.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
LIVE = ROOT / "images" / "pokemon"
HOME_OUT = LIVE / "home"
OA_OUT = LIVE / "official-artwork"
STAD_N = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Normal)"
STAD_S = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Shiny)"
OUT_JS = ROOT / "js" / "pokedex-presentation.js"
OVERRIDES_PATH = ROOT / "tools" / "pokedex-presentation-overrides.json"
KANTO = range(1, 152)
ALPHA_CUTOFF = 8
UA = "StarlightPlay-PokedexSync/1.0 (local build cache; not browser runtime)"
RAW = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other"

# Chamber safe-fit constants (fractions of observation stage)
SAFE_INSET = {"top": 0.06, "right": 0.07, "bottom": 0.16, "left": 0.07}
MIN_CORE_OCC = 0.34
MAX_CORE_OCC = 0.78
REF_HEIGHT_M = 1.2
REF_CORE_OCC = 0.52
SCALE_POWER = 0.38  # stronger diminishing returns for giants
MIN_PRESENT_OCC = 0.32
MAX_SAFE_OCC = 0.88  # hard ceiling — never a target


def public_url(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def load_overrides() -> dict:
    if not OVERRIDES_PATH.exists():
        return {}
    try:
        return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print("overrides parse failed", exc, file=sys.stderr)
        return {}


def load_heights() -> dict[int, float]:
    """formId/dex → heightM from local pokedex-reference.js"""
    ref_path = ROOT / "js" / "pokedex-reference.js"
    text = ref_path.read_text(encoding="utf-8", errors="ignore")
    # crude extract of forms block heights
    heights: dict[int, float] = {}
    for m in re.finditer(
        r'"(\d+)"\s*:\s*\{[^{}]*?"heightM"\s*:\s*([0-9.]+)',
        text,
    ):
        heights[int(m.group(1))] = float(m.group(2))
    return heights


def opaque_bounds_rgba(rgba: Image.Image) -> tuple[int, int, int, int] | None:
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


def iter_composed_rgba(im: Image.Image):
    """Yield full-canvas RGBA frames with GIF disposal handling."""
    w, h = im.size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    previous = None
    for frame in ImageSequence.Iterator(im):
        mode = frame.mode
        dispose = frame.info.get("disposal", frame.dispose) if hasattr(frame, "dispose") else frame.info.get("disposal", 0)
        # Pillow exposes disposal on the image after seek via .disposal_method in some versions
        try:
            dispose = im.disposal_method
        except Exception:
            dispose = frame.info.get("disposal", 0) or 0

        if previous is None:
            previous = canvas.copy()

        # Clear to background (disposal 2) uses previous snapshot before paste
        rgba = frame.convert("RGBA")
        # Paste with alpha
        canvas.paste(rgba, (0, 0), rgba)
        yield canvas.copy()

        if dispose == 2:
            # restore to background — clear frame rect
            # Prefer restoring previous
            canvas = previous.copy()
        elif dispose == 3:
            canvas = previous.copy()
        else:
            # dispose 0/1: do not restore; keep canvas; update previous
            previous = canvas.copy()


def build_union_mask(im: Image.Image) -> tuple[list[int], int, int, int]:
    w, h = im.size
    union = [0] * (w * h)
    frames = 0
    for rgba in iter_composed_rgba(im):
        frames += 1
        alpha = rgba.getchannel("A").tobytes()
        for i, a in enumerate(alpha):
            if a > ALPHA_CUTOFF:
                union[i] = 1
    return union, w, h, frames


def dens_trim(dens: list[int], total: int, lo: float, hi: float) -> tuple[int, int]:
    if total <= 0 or not dens:
        return 0, len(dens)
    c = 0
    a = 0
    for i, v in enumerate(dens):
        c += v
        if c >= total * lo:
            a = i
            break
    c = 0
    b = len(dens) - 1
    for i in range(len(dens) - 1, -1, -1):
        c += dens[i]
        if c >= total * (1.0 - hi):
            b = i
            break
    if b < a:
        return 0, len(dens)
    return a, b + 1


def analyze_composition_from_mask(union: list[int], w: int, h: int, frame_count: int) -> dict:
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        base = y * w
        for x in range(w):
            if union[base + x]:
                xs.append(x)
                ys.append(y)
    if not xs:
        return {
            "w": w,
            "h": h,
            "bounds": [0, 0, w, h],
            "alphaBounds": [0, 0, w, h],
            "coreBounds": [0, 0, w, h],
            "safeBounds": [0, 0, w, h],
            "padding": [0, 0, 0, 0],
            "visualCenterX": w / 2,
            "visualCenterY": h / 2,
            "groundY": h,
            "anchorType": "ground",
            "frameCount": frame_count,
            "alphaMass": 0,
        }

    ax0, ax1 = min(xs), max(xs) + 1
    ay0, ay1 = min(ys), max(ys) + 1
    mass = len(xs)
    col = [0] * w
    row = [0] * h
    for x, y in zip(xs, ys):
        col[x] += 1
        row[y] += 1

    # Trim extremities (tails/wings) for CORE prominence; keep feet.
    cx0, cx1 = dens_trim(col, mass, 0.10, 0.90)
    cy0, cy1 = dens_trim(row, mass, 0.06, 0.985)
    core_area = max(1, (cx1 - cx0) * (cy1 - cy0))
    alpha_area = max(1, (ax1 - ax0) * (ay1 - ay0))
    if core_area < 0.38 * alpha_area:
        # Expand toward alpha center if trim was too aggressive
        mx = (ax0 + ax1) / 2
        my = (ay0 + ay1) / 2
        tw = max(cx1 - cx0, int(0.55 * (ax1 - ax0)))
        th = max(cy1 - cy0, int(0.55 * (ay1 - ay0)))
        cx0 = max(ax0, int(mx - tw / 2))
        cx1 = min(ax1, int(mx + tw / 2))
        cy0 = max(ay0, int(my - th / 2))
        cy1 = min(ay1, int(my + th / 2))

    # Safe bounds = union alpha + 1px pad (never crop appendages)
    sx0 = max(0, ax0 - 1)
    sy0 = max(0, ay0 - 1)
    sx1 = min(w, ax1 + 1)
    sy1 = min(h, ay1 + 1)

    comx = sum(xs) / mass
    comy = sum(ys) / mass
    # Visual center prefers core center
    vcx = (cx0 + cx1) / 2
    vcy = (cy0 + cy1) / 2
    ground_y = ay1
    # Float if substantial empty space under feet OR mass centered high
    bottom_pad = h - ay1
    top_pad = ay0
    floatish = bottom_pad > max(6, int(0.12 * h)) or (comy < h * 0.42 and bottom_pad > 4)
    anchor = "float" if floatish else "ground"

    return {
        "w": w,
        "h": h,
        "bounds": [sx0, sy0, sx1 - sx0, sy1 - sy0],  # legacy alias = safe
        "alphaBounds": [ax0, ay0, ax1 - ax0, ay1 - ay0],
        "coreBounds": [cx0, cy0, cx1 - cx0, cy1 - cy0],
        "safeBounds": [sx0, sy0, sx1 - sx0, sy1 - sy0],
        "padding": [ay0, w - ax1, h - ay1, ax0],
        "visualCenterX": round(vcx, 2),
        "visualCenterY": round(vcy, 2),
        "groundY": ground_y,
        "anchorType": anchor,
        "frameCount": frame_count,
        "alphaMass": mass,
        "comX": round(comx, 2),
        "comY": round(comy, 2),
    }


def desired_core_occupancy(height_m: float | None) -> float:
    h = height_m if height_m and height_m > 0 else REF_HEIGHT_M
    # log-ish diminishing returns for giants
    ratio = math.pow(max(0.12, h) / REF_HEIGHT_M, SCALE_POWER)
    occ = REF_CORE_OCC * ratio
    # Soft giant compression: above ~3m, squeeze toward ceiling slowly
    if h >= 3.0:
        t = min(1.0, math.log10(h / 3.0 + 1.0) / math.log10(12.0))
        occ = occ * (1.0 - 0.18 * t) + MAX_CORE_OCC * (0.18 * t)
    return max(MIN_CORE_OCC, min(MAX_CORE_OCC, occ))


def compute_fit(comp: dict, height_m: float | None, override: dict | None = None) -> dict:
    """Two-stage scale: core desire then safe envelope constraint."""
    ow = override or {}
    safe = comp["safeBounds"]
    core = comp["coreBounds"]
    canvas_w = max(1, comp["w"])
    canvas_h = max(1, comp["h"])
    safe_w = max(1, safe[2])
    safe_h = max(1, safe[3])
    core_w = max(1, core[2])
    core_h = max(1, core[3])

    # Usable chamber fractions after insets
    usable_w = 1.0 - SAFE_INSET["left"] - SAFE_INSET["right"]
    usable_h = 1.0 - SAFE_INSET["top"] - SAFE_INSET["bottom"]

    desire = desired_core_occupancy(height_m)
    if "desiredCoreOccupancy" in ow:
        desire = float(ow["desiredCoreOccupancy"])
    if "scaleMultiplier" in ow:
        desire = max(MIN_CORE_OCC, min(MAX_CORE_OCC, desire * float(ow["scaleMultiplier"])))

    # Candidate: make core occupy `desire` of chamber height
    # When rendering SAFE region into chamber, core is (core_h/safe_h) of that display.
    core_of_safe = core_h / safe_h
    # display_h_frac such that display_h_frac * core_of_safe = desire
    # => display_h_frac = desire / core_of_safe
    candidate_h = desire / max(0.25, core_of_safe)

    # Safe maximum: entire safe envelope inside usable area
    # Also width: display_w = display_h * (safe_w/safe_h) <= usable_w
    aspect = safe_w / safe_h
    max_h_from_height = usable_h * MAX_SAFE_OCC / usable_h  # = MAX_SAFE_OCC of full stage via usable
    # Interpret final occ as fraction of FULL stage for CSS compatibility
    max_safe_h = usable_h  # envelope must fit in usable band
    max_safe_w = usable_w
    max_h_from_width = max_safe_w / aspect if aspect > 0 else max_safe_h

    safe_max_h = min(max_safe_h, max_h_from_width)
    final_h = min(candidate_h, safe_max_h)
    final_h = max(MIN_PRESENT_OCC * (usable_h / 0.78), min(final_h, safe_max_h))
    # Clamp to absolute ceiling
    final_h = min(final_h, MAX_SAFE_OCC)

    # Tall/extreme silhouettes keep breathing room even at the safe ceiling.
    aspect_hw = safe_h / max(1, safe_w)
    if aspect_hw >= 1.45 and final_h > usable_h * 0.9:
        final_h *= 0.92
    if height_m and height_m >= 12 and final_h > usable_h * 0.88:
        final_h *= 0.94

    # Audited multiplier applies to FINAL presentation, not only desire.
    if "scaleMultiplier" in ow:
        final_h *= float(ow["scaleMultiplier"])

    final_h = min(final_h, safe_max_h, MAX_SAFE_OCC)
    final_h = max(MIN_PRESENT_OCC * 0.9, final_h)

    final_w = final_h * aspect
    if final_w > max_safe_w:
        final_w = max_safe_w
        final_h = final_w / aspect

    # Core/full envelope occupancy for QA reporting (fractions of stage)
    core_occ = final_h * core_of_safe
    full_occ = final_h

    anchor = ow.get("anchorOverride") or comp["anchorType"]
    x_off = float(ow.get("xOffset") or 0)
    y_off = float(ow.get("yOffset") or 0)

    return {
        "canonicalHeightM": height_m,
        "desiredCoreOccupancy": round(desire, 4),
        "maxSafeScaleH": round(safe_max_h, 4),
        "finalScaleH": round(final_h, 4),
        "finalScaleW": round(final_w, 4),
        "coreOccupancy": round(core_occ, 4),
        "fullEnvelopeOccupancy": round(full_occ, 4),
        "anchorType": anchor,
        "xOffset": x_off,
        "yOffset": y_off,
        "safeInset": SAFE_INSET,
    }


def analyze_gif(path: Path, height_m: float | None = None, override: dict | None = None) -> dict | None:
    if not path.exists():
        return None
    try:
        im = Image.open(path)
    except Exception as exc:
        print("skip gif", path, exc, file=sys.stderr)
        return None

    # Force load all frames for disposal metadata
    try:
        im.seek(0)
    except Exception:
        pass

    union, w, h, n = build_union_mask(im)
    if n <= 0:
        n = getattr(im, "n_frames", 1) or 1
        # fallback: simple per-frame without composition
        boxes = []
        for i in range(n):
            try:
                im.seek(i)
            except EOFError:
                break
            box = opaque_bounds_rgba(im.convert("RGBA"))
            if box:
                boxes.append(box)
        ub = union_bounds(boxes) or (0, 0, w, h)
        union = [0] * (w * h)
        x0, y0, bw, bh = ub
        for y in range(y0, y0 + bh):
            for x in range(x0, x0 + bw):
                union[y * w + x] = 1

    if override and override.get("coreBoundsOverride"):
        # applied after base analyze
        pass

    comp = analyze_composition_from_mask(union, w, h, n)
    if override and override.get("coreBoundsOverride"):
        cb = override["coreBoundsOverride"]
        comp["coreBounds"] = list(cb)
    if override and override.get("safeBoundsOverride"):
        sb = override["safeBoundsOverride"]
        comp["safeBounds"] = list(sb)
        comp["bounds"] = list(sb)

    fit = compute_fit(comp, height_m, override)
    return {
        "w": w,
        "h": h,
        "bounds": comp["bounds"],
        "alphaBounds": comp["alphaBounds"],
        "coreBounds": comp["coreBounds"],
        "safeBounds": comp["safeBounds"],
        "padding": comp["padding"],
        "visualCenterX": comp["visualCenterX"],
        "visualCenterY": comp["visualCenterY"],
        "groundY": comp["groundY"],
        "anchorType": fit["anchorType"],
        "frameCount": n,
        "class": "battle",
        "render": "pixelated",
        "url": public_url(path),
        "composition": fit,
        "alphaMass": comp.get("alphaMass", 0),
    }


def analyze_still(im: Image.Image, height_m: float | None = None, override: dict | None = None) -> dict:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    union = [1 if a > ALPHA_CUTOFF else 0 for a in rgba.getchannel("A").tobytes()]
    comp = analyze_composition_from_mask(union, w, h, 1)
    fit = compute_fit(comp, height_m, override)
    return {
        "w": w,
        "h": h,
        "bounds": comp["bounds"],
        "alphaBounds": comp["alphaBounds"],
        "coreBounds": comp["coreBounds"],
        "safeBounds": comp["safeBounds"],
        "padding": comp["padding"],
        "visualCenterX": comp["visualCenterX"],
        "visualCenterY": comp["visualCenterY"],
        "groundY": comp["groundY"],
        "anchorType": fit["anchorType"],
        "frameCount": 1,
        "composition": fit,
    }


def load_png_meta(path: Path, height_m: float | None = None) -> dict | None:
    if not path.exists() or path.stat().st_size < 200:
        return None
    try:
        im = Image.open(path).convert("RGBA")
    except Exception as exc:
        print("skip png", path, exc, file=sys.stderr)
        return None
    return analyze_still(im, height_m)


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


def override_key(dex: int, form_id: int | None, shiny: bool, female: bool) -> str:
    fid = form_id if form_id and form_id != dex else dex
    bits = [str(dex), str(fid)]
    if shiny and female:
        bits.append("shiny-female")
    elif shiny:
        bits.append("shiny")
    elif female:
        bits.append("female")
    else:
        bits.append("normal")
    return ":".join(bits)


def tier_meta(kind: str, pid: int, shiny: bool = False, height_m: float | None = None) -> dict | None:
    base = HOME_OUT if kind == "home" else OA_OUT
    path = base / f"{'shiny/' if shiny else ''}{pid}.png"
    if not path.exists():
        sync_remote(kind, pid, shiny=shiny)
    meta = load_png_meta(path, height_m)
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
        "alphaBounds": meta.get("alphaBounds"),
        "coreBounds": meta.get("coreBounds"),
        "safeBounds": meta.get("safeBounds"),
        "composition": meta.get("composition"),
        "visualCenterX": meta.get("visualCenterX"),
        "visualCenterY": meta.get("visualCenterY"),
        "groundY": meta.get("groundY"),
        "anchorType": meta.get("anchorType"),
        "frameCount": 1,
    }


def stadium_gif(dex: int, shiny: bool = False, height_m: float | None = None) -> dict | None:
    root = STAD_S if shiny else STAD_N
    path = find_gif(root, dex)
    if not path:
        return None
    try:
        im = Image.open(path)
        im.seek(0)
        frame = im.convert("RGBA")
    except Exception:
        return None
    dest = HOME_OUT / "_fallback" / f"{'shiny-' if shiny else ''}{dex}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.save(dest, format="PNG", optimize=True)
    meta = analyze_still(frame, height_m)
    return {
        "class": "stadium2",
        "render": "pixelated",
        "url": public_url(dest),
        "w": meta["w"],
        "h": meta["h"],
        "bounds": meta["bounds"],
        "alphaBounds": meta.get("alphaBounds"),
        "coreBounds": meta.get("coreBounds"),
        "safeBounds": meta.get("safeBounds"),
        "composition": meta.get("composition"),
        "frameCount": 1,
        "anchorType": meta.get("anchorType"),
        "visualCenterX": meta.get("visualCenterX"),
        "visualCenterY": meta.get("visualCenterY"),
        "groundY": meta.get("groundY"),
    }


def pack_animated(animated: dict) -> dict:
    keys = [
        "class", "render", "url", "w", "h", "bounds", "frameCount",
        "alphaBounds", "coreBounds", "safeBounds", "padding",
        "visualCenterX", "visualCenterY", "groundY", "anchorType",
        "composition",
    ]
    return {k: animated[k] for k in keys if k in animated and animated[k] is not None}


def build_variant(
    dex: int,
    form_id: int | None = None,
    shiny: bool = False,
    female: bool = False,
    heights: dict[int, float] | None = None,
    overrides: dict | None = None,
) -> dict | None:
    pid = form_id if form_id and form_id != dex else dex
    heights = heights or {}
    height_m = heights.get(pid) or heights.get(dex)
    ovr = (overrides or {}).get(override_key(dex, form_id, shiny, female)) or {}
    # form-level override without variant
    if not ovr and form_id and form_id != dex:
        ovr = (overrides or {}).get(f"{dex}:{form_id}") or {}
    if not ovr:
        ovr = (overrides or {}).get(str(pid)) or {}

    animated = None
    gif = battle_gif_path(dex, form_id=form_id, shiny=shiny, female=female)
    if gif:
        animated = analyze_gif(gif, height_m=height_m, override=ovr)

    home = tier_meta("home", pid, shiny=shiny, height_m=height_m)
    oa = tier_meta("official-artwork", pid, shiny=shiny, height_m=height_m)

    primary = animated
    if not primary and home:
        primary = {**home}
    if not primary and oa:
        primary = {**oa}
    if not primary and not form_id:
        primary = stadium_gif(dex, shiny=shiny, height_m=height_m)

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
    for k in (
        "alphaBounds", "coreBounds", "safeBounds", "padding",
        "visualCenterX", "visualCenterY", "groundY", "anchorType", "composition",
    ):
        if primary.get(k) is not None:
            entry[k] = primary[k]

    if animated:
        entry["animatedAsset"] = pack_animated(animated)
    if home:
        entry["homeAsset"] = home
    if oa:
        entry["officialArtworkAsset"] = oa
    return entry


def harmonize_appearance_scales(variants: list[dict]) -> None:
    """Keep Normal/Shiny/Female of the same form from jumping in apparent size."""
    comps = []
    for v in variants:
        if not v:
            continue
        c = (v.get("animatedAsset") or v).get("composition")
        if c and c.get("finalScaleH"):
            comps.append((v, c))
    if len(comps) < 2:
        return
    # Share the most restrictive FINAL scale already computed (includes overrides).
    shared_h = min(c["finalScaleH"] for _, c in comps)
    for v, c in comps:
        safe = (v.get("animatedAsset") or v).get("safeBounds") or v.get("safeBounds") or v.get("bounds")
        core = (v.get("animatedAsset") or v).get("coreBounds") or v.get("coreBounds")
        if not safe:
            continue
        aspect = safe[2] / max(1, safe[3])
        final_h = shared_h
        final_w = final_h * aspect
        usable_w = 1.0 - SAFE_INSET["left"] - SAFE_INSET["right"]
        if final_w > usable_w:
            final_w = usable_w
            final_h = final_w / aspect
        c["finalScaleH"] = round(final_h, 4)
        c["finalScaleW"] = round(final_w, 4)
        if core:
            core_of_safe = max(0.25, core[3] / max(1, safe[3]))
            c["coreOccupancy"] = round(final_h * core_of_safe, 4)
        c["fullEnvelopeOccupancy"] = round(final_h, 4)
        c["harmonized"] = True


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
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-prefetch", action="store_true", help="Skip HOME/OA remote prefetch")
    ap.add_argument("--only", type=str, default="", help="Comma dex/form ids for quick rebuild debug")
    args = ap.parse_args()

    forms_js = (ROOT / "js" / "forms.js").read_text(encoding="utf-8", errors="ignore")
    pairs = re.findall(r'"formId"\s*:\s*(\d+)\s*,\s*"dex"\s*:\s*(\d+)', forms_js)
    form_to_dex = {int(fid): int(dex) for fid, dex in pairs if int(dex) <= 151}
    form_ids = sorted({fid for fid, dex in form_to_dex.items() if fid != dex})
    heights = load_heights()
    overrides = load_overrides()

    all_ids = sorted(set(KANTO) | set(form_ids))
    if not args.skip_prefetch:
        print(f"ensuring HOME/OA stills for {len(all_ids)} ids (retained catalog)…")
        prefetch_still_ids(all_ids)
    else:
        print("skip prefetch")

    only: set[int] | None = None
    if args.only:
        only = {int(x) for x in args.only.split(",") if x.strip()}

    assets: dict[str, dict] = {}
    counts: dict[str, int] = {}
    frames_total = 0
    assets_analyzed = 0

    for dex in KANTO:
        if only and dex not in only:
            continue
        entry = build_variant(dex, heights=heights, overrides=overrides)
        if not entry:
            print("MISSING base", dex, file=sys.stderr)
            continue
        shiny = build_variant(dex, shiny=True, heights=heights, overrides=overrides)
        female = build_variant(dex, female=True, heights=heights, overrides=overrides)
        shiny_female = build_variant(dex, shiny=True, female=True, heights=heights, overrides=overrides)

        harmonize_appearance_scales([entry, shiny, female, shiny_female])

        if shiny:
            entry["shinyUrl"] = shiny["url"]
            entry["shiny"] = pack_animated(shiny) if shiny.get("animatedAsset") or shiny.get("class") == "battle" else {
                "w": shiny["w"], "h": shiny["h"], "bounds": shiny["bounds"],
                "class": shiny["class"], "render": shiny["render"],
                "frameCount": shiny.get("frameCount", 1),
                "composition": shiny.get("composition"),
                "coreBounds": shiny.get("coreBounds"),
                "safeBounds": shiny.get("safeBounds"),
                "alphaBounds": shiny.get("alphaBounds"),
            }
            if shiny.get("animatedAsset"):
                entry["shiny"]["animatedAsset"] = shiny["animatedAsset"]
            if shiny.get("homeAsset"):
                entry["shiny"]["homeAsset"] = shiny["homeAsset"]
        if female:
            entry["female"] = pack_animated(female)
        if shiny_female:
            entry["shinyFemale"] = pack_animated(shiny_female)

        if entry.get("animatedAsset"):
            entry["battleFallback"] = entry["animatedAsset"]
            frames_total += int(entry.get("frameCount") or 1)
            assets_analyzed += 1
        assets[str(dex)] = entry
        counts[entry["class"]] = counts.get(entry["class"], 0) + 1
        if dex % 25 == 0:
            print(f"base {dex}/151 class={entry['class']} frames={entry.get('frameCount')}")

    for form_id in form_ids:
        if only and form_id not in only and form_to_dex[form_id] not in (only or set()):
            # allow --only 10199
            if only and form_id not in only:
                continue
        dex = form_to_dex[form_id]
        entry = build_variant(dex, form_id=form_id, heights=heights, overrides=overrides)
        if not entry:
            continue
        shiny = build_variant(dex, form_id=form_id, shiny=True, heights=heights, overrides=overrides)
        harmonize_appearance_scales([entry, shiny])
        if shiny:
            entry["shinyUrl"] = shiny["url"]
            entry["shiny"] = {
                "w": shiny["w"],
                "h": shiny["h"],
                "bounds": shiny["bounds"],
                "class": shiny["class"],
                "render": shiny["render"],
                "frameCount": shiny.get("frameCount", 1),
                "composition": shiny.get("composition"),
                "coreBounds": shiny.get("coreBounds"),
                "safeBounds": shiny.get("safeBounds"),
                "alphaBounds": shiny.get("alphaBounds"),
                "anchorType": shiny.get("anchorType"),
                "visualCenterX": shiny.get("visualCenterX"),
                "visualCenterY": shiny.get("visualCenterY"),
                "groundY": shiny.get("groundY"),
            }
            if shiny.get("animatedAsset"):
                entry["shiny"]["animatedAsset"] = shiny["animatedAsset"]
            if shiny.get("homeAsset"):
                entry["shiny"]["homeAsset"] = shiny["homeAsset"]
        if entry.get("animatedAsset"):
            entry["battleFallback"] = entry["animatedAsset"]
            frames_total += int(entry.get("frameCount") or 1)
            assets_analyzed += 1
        assets[f"{dex}:{form_id}"] = entry
        counts[entry["class"]] = counts.get(entry["class"], 0) + 1

    animated_n = sum(1 for a in assets.values() if a.get("animatedAsset") or a.get("class") == "battle")
    home_n = sum(1 for a in assets.values() if a.get("homeAsset"))
    payload = {
        "version": 4,
        "envelope": {
            "occupancyH": 0.52,
            "occupancyW": 0.72,
            "margin": 0.02,
            "minOccupancyH": MIN_PRESENT_OCC,
            "maxOccupancyH": MAX_SAFE_OCC,
            "refHeightM": REF_HEIGHT_M,
            "refOccupancyH": REF_CORE_OCC,
            "scalePower": SCALE_POWER,
            "safeInset": SAFE_INSET,
            "maxCoreOccupancy": MAX_CORE_OCC,
            "minCoreOccupancy": MIN_CORE_OCC,
        },
        "priority": ["battle", "home", "official-artwork", "stadium2"],
        "assets": assets,
        "buildStats": {
            "assetsAnalyzed": assets_analyzed,
            "framesAnalyzed": frames_total,
        },
    }
    OUT_JS.write_text(
        "/* generated by tools/build-pokedex-presentation.py — data only */\n"
        f"window.PLAY_POKEDEX_PRESENTATION = {json.dumps(payload, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print(
        "wrote", OUT_JS,
        "keys", len(assets),
        "primary", counts,
        "animated", animated_n,
        "homeRetained", home_n,
        "frames", frames_total,
    )
    # Quick proof print for Gmax Pikachu
    g = assets.get("25:10199")
    if g and g.get("composition"):
        print("GMAX PIKACHU fit", g["composition"], "safe", g.get("safeBounds"), "core", g.get("coreBounds"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
