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
# Ordinary ~4–6% edge clearance; platform band reserved at bottom.
SAFE_INSET = {"top": 0.045, "right": 0.05, "bottom": 0.13, "left": 0.05}
# Extreme tall/wide may approach the frame more closely (still never clip).
SAFE_INSET_EXTREME = {"top": 0.032, "right": 0.038, "bottom": 0.12, "left": 0.038}
MIN_CORE_OCC = 0.36
MAX_CORE_OCC = 0.86
REF_HEIGHT_M = 1.2
REF_CORE_OCC = 0.58
SCALE_POWER = 0.42
MIN_PRESENT_OCC = 0.36
MAX_SAFE_OCC = 0.92  # hard ceiling — never a target
CATALOG_FLOOR_KEYS = 220
CATALOG_KANTO_BASE = 151

# Morphology-aware insets (still never clip; safeBounds remain authority).
SAFE_INSET_SERPENTINE = {"top": 0.025, "right": 0.012, "bottom": 0.10, "left": 0.012}
SAFE_INSET_WINGED = {"top": 0.038, "right": 0.028, "bottom": 0.125, "left": 0.028}

# Data-driven morphology overrides (formId first, then dex). Rendering metadata only.
MORPHOLOGY_BY_ID: dict[int, dict] = {
    # Serpentine / long-body Kanto anchors
    24: {"morphology": "SERPENTINE", "flags": ["LONG_BODY"]},
    95: {"morphology": "SERPENTINE", "flags": ["LONG_BODY"]},
    130: {"morphology": "SERPENTINE", "flags": ["LONG_BODY"]},
    147: {"morphology": "SERPENTINE", "flags": ["LONG_BODY"]},
    148: {"morphology": "SERPENTINE", "flags": ["LONG_BODY"]},
    149: {"morphology": "BIPED", "flags": ["WINGED", "EXTREME_APPENDAGE"]},
    # Winged legends / starters
    6: {"morphology": "BIPED", "flags": ["WINGED", "EXTREME_APPENDAGE"]},
    144: {"morphology": "WINGED", "flags": ["FLOATING"]},
    145: {"morphology": "WINGED", "flags": ["FLOATING", "EXTREME_APPENDAGE"]},
    146: {"morphology": "WINGED", "flags": ["FLOATING", "EXTREME_APPENDAGE"]},
    # Floating
    92: {"morphology": "FLOATING", "flags": []},
    93: {"morphology": "FLOATING", "flags": []},
    94: {"morphology": "FLOATING", "flags": ["EXTREME_APPENDAGE"]},
    81: {"morphology": "FLOATING", "flags": []},
    82: {"morphology": "FLOATING", "flags": []},
    150: {"morphology": "BIPED", "flags": []},
    # Small standards (lock — do not globally enlarge)
    25: {"morphology": "SMALL_STANDARD", "flags": ["EXTREME_APPENDAGE"]},
    26: {"morphology": "SMALL_STANDARD", "flags": ["EXTREME_APPENDAGE"]},
    # Form-specific
    10196: {"morphology": "GIANT_FORM", "flags": ["WINGED"]},  # Gmax Charizard — preserve
    10199: {"morphology": "GIANT_FORM", "flags": ["EXTREME_APPENDAGE"]},  # Gmax Pikachu
    10034: {"morphology": "BIPED", "flags": ["WINGED", "EXTREME_APPENDAGE"]},
    10035: {"morphology": "BIPED", "flags": ["WINGED", "EXTREME_APPENDAGE"]},
    10169: {"morphology": "WINGED", "flags": ["FLOATING"]},
    10170: {"morphology": "WINGED", "flags": ["FLOATING"]},
    10171: {"morphology": "WINGED", "flags": ["FLOATING"]},
}


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


def resolve_morphology_meta(pid: int | None, dex: int | None = None) -> dict | None:
    """FormId overrides species; returns {morphology, flags} or None."""
    if pid is not None and pid in MORPHOLOGY_BY_ID:
        return dict(MORPHOLOGY_BY_ID[pid])
    if dex is not None and dex in MORPHOLOGY_BY_ID:
        return dict(MORPHOLOGY_BY_ID[dex])
    return None


def auto_morphology_from_signals(
    height_m: float | None,
    alpha_w: int,
    alpha_h: int,
    core_w: int,
    core_h: int,
    alpha_mass: int,
    floatish: bool,
) -> dict:
    """Deterministic morphology guess from composition signals (no CSS)."""
    flags: list[str] = []
    morphology = "STANDARD"
    aw = max(1, alpha_w)
    ah = max(1, alpha_h)
    aspect_wh = aw / ah
    aspect_hw = ah / aw
    alpha_area = aw * ah
    density = alpha_mass / max(1, alpha_area)
    core_area = max(1, core_w * core_h)
    core_safe_ratio = core_area / max(1, alpha_area)
    h = height_m if height_m and height_m > 0 else REF_HEIGHT_M

    if h >= 12.0:
        morphology = "GIANT_FORM"
    elif floatish and h <= 2.2:
        morphology = "FLOATING"
    elif aspect_hw >= 1.45 and h >= 2.5 and density <= 0.55:
        morphology = "SERPENTINE"
        flags.append("LONG_BODY")
    elif aspect_wh >= 1.35 and h >= 2.5 and density <= 0.50:
        morphology = "SERPENTINE"
        flags.append("LONG_BODY")
    elif aspect_hw >= 1.35 and h >= 3.0:
        morphology = "LONG_BODY"
        flags.append("LONG_BODY")
    elif aspect_wh >= 1.35 and core_safe_ratio <= 0.62:
        morphology = "WINGED"
        flags.append("WINGED")
        if core_safe_ratio <= 0.50:
            flags.append("EXTREME_APPENDAGE")
    elif h <= 0.55:
        morphology = "SMALL_STANDARD"
    elif aspect_hw >= 1.15 and h >= 0.8:
        morphology = "BIPED"
    elif aspect_wh >= 1.15:
        morphology = "QUADRUPED"

    if floatish and "FLOATING" not in flags and morphology != "FLOATING":
        flags.append("FLOATING")
    return {"morphology": morphology, "flags": flags}


def morphology_desire_factor(morphology: str, flags: list[str]) -> float:
    """Adjust desired core occupancy only — never overrides containment."""
    f = 1.0
    m = (morphology or "STANDARD").upper()
    fl = {str(x).upper() for x in (flags or [])}
    if m == "GIANT_FORM":
        return 1.0  # preserve approved giant presentation
    if m == "SMALL_STANDARD":
        return 1.0
    if m == "SERPENTINE":
        f *= 1.14
    elif m == "LONG_BODY":
        f *= 1.08
    if "LONG_BODY" in fl and m not in ("SERPENTINE", "LONG_BODY"):
        f *= 1.05
    if m == "WINGED" or "WINGED" in fl:
        if m != "GIANT_FORM":
            f *= 1.09
    if m == "FLOATING" or "FLOATING" in fl:
        f *= 1.02
    if "EXTREME_APPENDAGE" in fl and m in ("BIPED", "WINGED"):
        f *= 1.02
    return f


def serpentine_presence_cap(height_m: float | None) -> float | None:
    """Keep elongated species progressing by canonical size (not identical ceilings)."""
    if height_m is None or height_m <= 0:
        return None
    bands = [
        (2.5, 0.74),
        (3.5, 0.79),
        (4.0, 0.82),
        (6.5, 0.855),
        (8.8, 0.88),
        (12.0, 0.89),
    ]
    h = height_m
    if h <= bands[0][0]:
        return bands[0][1]
    if h >= bands[-1][0]:
        return bands[-1][1]
    for i in range(1, len(bands)):
        h0, o0 = bands[i - 1]
        h1, o1 = bands[i]
        if h0 <= h <= h1:
            t = (h - h0) / max(1e-6, h1 - h0)
            t = t * t * (3 - 2 * t)
            return o0 + (o1 - o0) * t
    return None


def morphology_core_trim(morphology: str, flags: list[str]) -> tuple[float, float, float, float]:
    """Return dens_trim lo/hi for columns then rows."""
    m = (morphology or "STANDARD").upper()
    fl = {str(x).upper() for x in (flags or [])}
    # Default: trim extremities for body prominence
    col_lo, col_hi = 0.10, 0.90
    row_lo, row_hi = 0.06, 0.985
    if m in ("SERPENTINE", "LONG_BODY") or "LONG_BODY" in fl:
        # Count most of the elongated body as core mass
        col_lo, col_hi = 0.03, 0.97
        row_lo, row_hi = 0.02, 0.99
    elif m == "WINGED" or "WINGED" in fl:
        # Body drives prominence; wings stay in safeBounds only
        col_lo, col_hi = 0.18, 0.82
        row_lo, row_hi = 0.08, 0.96
    elif "EXTREME_APPENDAGE" in fl and m in ("BIPED", "SMALL_STANDARD"):
        col_lo, col_hi = 0.12, 0.88
        row_lo, row_hi = 0.05, 0.97
    elif m == "WIDE":
        col_lo, col_hi = 0.08, 0.92
        row_lo, row_hi = 0.10, 0.95
    return col_lo, col_hi, row_lo, row_hi


def analyze_composition_from_mask(
    union: list[int],
    w: int,
    h: int,
    frame_count: int,
    morphology_hint: dict | None = None,
    height_m: float | None = None,
) -> dict:
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
            "morphology": "STANDARD",
            "morphologyFlags": [],
        }

    ax0, ax1 = min(xs), max(xs) + 1
    ay0, ay1 = min(ys), max(ys) + 1
    mass = len(xs)
    col = [0] * w
    row = [0] * h
    for x, y in zip(xs, ys):
        col[x] += 1
        row[y] += 1

    # Provisional trim for auto-classification signals
    pcx0, pcx1 = dens_trim(col, mass, 0.10, 0.90)
    pcy0, pcy1 = dens_trim(row, mass, 0.06, 0.985)
    comx = sum(xs) / mass
    comy = sum(ys) / mass
    bottom_pad = h - ay1
    floatish = bottom_pad > max(6, int(0.12 * h)) or (comy < h * 0.42 and bottom_pad > 4)

    if morphology_hint:
        morph = dict(morphology_hint)
    else:
        morph = auto_morphology_from_signals(
            height_m,
            ax1 - ax0,
            ay1 - ay0,
            max(1, pcx1 - pcx0),
            max(1, pcy1 - pcy0),
            mass,
            floatish,
        )
    morphology = str(morph.get("morphology") or "STANDARD").upper()
    flags = [str(f).upper() for f in (morph.get("flags") or [])]

    col_lo, col_hi, row_lo, row_hi = morphology_core_trim(morphology, flags)
    cx0, cx1 = dens_trim(col, mass, col_lo, col_hi)
    cy0, cy1 = dens_trim(row, mass, row_lo, row_hi)
    core_area = max(1, (cx1 - cx0) * (cy1 - cy0))
    alpha_area = max(1, (ax1 - ax0) * (ay1 - ay0))
    min_core_frac = 0.55 if morphology in ("SERPENTINE", "LONG_BODY") else 0.38
    expand_frac = 0.88 if morphology in ("SERPENTINE", "LONG_BODY") else 0.55
    if core_area < min_core_frac * alpha_area:
        # Expand toward alpha center if trim was too aggressive
        mx = (ax0 + ax1) / 2
        my = (ay0 + ay1) / 2
        tw = max(cx1 - cx0, int(expand_frac * (ax1 - ax0)))
        th = max(cy1 - cy0, int(expand_frac * (ay1 - ay0)))
        cx0 = max(ax0, int(mx - tw / 2))
        cx1 = min(ax1, int(mx + tw / 2))
        cy0 = max(ay0, int(my - th / 2))
        cy1 = min(ay1, int(my + th / 2))

    # Safe bounds = union alpha + 1px pad (never crop appendages)
    sx0 = max(0, ax0 - 1)
    sy0 = max(0, ay0 - 1)
    sx1 = min(w, ax1 + 1)
    sy1 = min(h, ay1 + 1)

    # Visual center prefers core center; floating uses COM slightly
    vcx = (cx0 + cx1) / 2
    vcy = (cy0 + cy1) / 2
    if morphology == "FLOATING" or "FLOATING" in flags:
        vcx = 0.65 * vcx + 0.35 * comx
        vcy = 0.55 * vcy + 0.45 * comy
        floatish = True
    ground_y = ay1
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
        "morphology": morphology,
        "morphologyFlags": flags,
        "alphaDensity": round(mass / max(1, alpha_area), 4),
        "coreSafeRatio": round(core_area / max(1, alpha_area), 4),
    }


def desired_core_occupancy(height_m: float | None) -> float:
    """Body prominence targets by canonical height (calibration bands)."""
    h = height_m if height_m and height_m > 0 else REF_HEIGHT_M
    # (height_m, desired core occupancy of chamber)
    bands = [
        (0.10, 0.38),
        (0.30, 0.42),
        (0.40, 0.45),
        (0.50, 0.47),
        (0.80, 0.52),
        (0.90, 0.53),
        (1.00, 0.56),
        (1.20, 0.58),
        (1.50, 0.62),
        (1.70, 0.66),
        (2.00, 0.69),
        (2.40, 0.72),
        (3.00, 0.74),
        (5.00, 0.77),
        (8.00, 0.79),
        (12.0, 0.82),
        (21.0, 0.85),
        (30.0, 0.86),
    ]
    if h <= bands[0][0]:
        return bands[0][1]
    if h >= bands[-1][0]:
        return bands[-1][1]
    for i in range(1, len(bands)):
        h0, o0 = bands[i - 1]
        h1, o1 = bands[i]
        if h0 <= h <= h1:
            t = (h - h0) / max(1e-6, h1 - h0)
            # ease toward larger sizes
            t = t * t * (3 - 2 * t)
            return max(MIN_CORE_OCC, min(MAX_CORE_OCC, o0 + (o1 - o0) * t))
    return REF_CORE_OCC


def active_safe_inset(comp: dict, height_m: float | None) -> dict:
    safe = comp["safeBounds"]
    safe_w = max(1, safe[2])
    safe_h = max(1, safe[3])
    aspect_hw = safe_h / safe_w
    aspect_wh = safe_w / safe_h
    morphology = str(comp.get("morphology") or "").upper()
    flags = {str(f).upper() for f in (comp.get("morphologyFlags") or [])}
    extreme = (
        (height_m is not None and height_m >= 8.0)
        or aspect_hw >= 1.35
        or aspect_wh >= 1.45
    )
    if morphology in ("SERPENTINE", "LONG_BODY") or "LONG_BODY" in flags:
        return dict(SAFE_INSET_SERPENTINE)
    if morphology == "GIANT_FORM":
        return dict(SAFE_INSET_EXTREME if extreme else SAFE_INSET)
    if (morphology == "WINGED" or "WINGED" in flags) and morphology != "GIANT_FORM":
        base = dict(SAFE_INSET_WINGED)
        if extreme:
            base["top"] = min(base["top"], SAFE_INSET_EXTREME["top"])
            base["bottom"] = min(base["bottom"], SAFE_INSET_EXTREME["bottom"])
        return base
    return dict(SAFE_INSET_EXTREME if extreme else SAFE_INSET)


def compute_fit(comp: dict, height_m: float | None, override: dict | None = None) -> dict:
    """Two-stage scale: core desire then safe envelope constraint."""
    ow = override or {}
    safe = comp["safeBounds"]
    core = comp["coreBounds"]
    safe_w = max(1, safe[2])
    safe_h = max(1, safe[3])
    core_h = max(1, core[3])

    inset = active_safe_inset(comp, height_m)
    if ow.get("safeInset"):
        inset = {**inset, **ow["safeInset"]}

    usable_w = 1.0 - inset["left"] - inset["right"]
    usable_h = 1.0 - inset["top"] - inset["bottom"]

    desire = desired_core_occupancy(height_m)
    morphology = str(comp.get("morphology") or "STANDARD")
    flags = list(comp.get("morphologyFlags") or [])
    desire *= morphology_desire_factor(morphology, flags)
    desire = max(MIN_CORE_OCC, min(MAX_CORE_OCC, desire))

    if "desiredCoreOccupancy" in ow:
        desire = float(ow["desiredCoreOccupancy"])
    if "scaleMultiplier" in ow:
        desire = max(MIN_CORE_OCC, min(MAX_CORE_OCC, desire * float(ow["scaleMultiplier"])))

    core_of_safe = core_h / safe_h
    candidate_h = desire / max(0.25, core_of_safe)

    aspect = safe_w / safe_h
    max_safe_h = usable_h
    max_safe_w = usable_w
    max_h_from_width = max_safe_w / aspect if aspect > 0 else max_safe_h

    safe_max_h = min(max_safe_h, max_h_from_width, MAX_SAFE_OCC)
    if morphology in ("SERPENTINE", "LONG_BODY") or "LONG_BODY" in {str(f).upper() for f in flags}:
        cap = serpentine_presence_cap(height_m)
        if cap is not None:
            safe_max_h = min(safe_max_h, cap)
    final_h = min(candidate_h, safe_max_h)
    final_h = max(MIN_PRESENT_OCC, min(final_h, safe_max_h))

    # Tiny breathing room only when parked on the absolute ceiling.
    if final_h >= safe_max_h * 0.995:
        final_h *= 0.985

    if "scaleMultiplier" in ow:
        final_h *= float(ow["scaleMultiplier"])

    final_h = min(final_h, safe_max_h, MAX_SAFE_OCC)
    final_h = max(MIN_PRESENT_OCC * 0.95, final_h)

    final_w = final_h * aspect
    if final_w > max_safe_w:
        final_w = max_safe_w
        final_h = final_w / aspect

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
        "safeInset": inset,
        "morphology": morphology,
        "morphologyFlags": flags,
    }


def analyze_gif(
    path: Path,
    height_m: float | None = None,
    override: dict | None = None,
    morphology_hint: dict | None = None,
) -> dict | None:
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

    comp = analyze_composition_from_mask(
        union, w, h, n, morphology_hint=morphology_hint, height_m=height_m
    )
    if override and override.get("coreBoundsOverride"):
        cb = override["coreBoundsOverride"]
        comp["coreBounds"] = list(cb)
    if override and override.get("safeBoundsOverride"):
        sb = override["safeBoundsOverride"]
        comp["safeBounds"] = list(sb)
        comp["bounds"] = list(sb)
    if override and override.get("morphology"):
        comp["morphology"] = str(override["morphology"]).upper()
    if override and override.get("morphologyFlags"):
        comp["morphologyFlags"] = [str(f).upper() for f in override["morphologyFlags"]]

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
        "morphology": fit.get("morphology"),
        "morphologyFlags": fit.get("morphologyFlags"),
    }


def analyze_still(
    im: Image.Image,
    height_m: float | None = None,
    override: dict | None = None,
    morphology_hint: dict | None = None,
) -> dict:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    union = [1 if a > ALPHA_CUTOFF else 0 for a in rgba.getchannel("A").tobytes()]
    comp = analyze_composition_from_mask(
        union, w, h, 1, morphology_hint=morphology_hint, height_m=height_m
    )
    if override and override.get("morphology"):
        comp["morphology"] = str(override["morphology"]).upper()
    if override and override.get("morphologyFlags"):
        comp["morphologyFlags"] = [str(f).upper() for f in override["morphologyFlags"]]
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
        "morphology": fit.get("morphology"),
        "morphologyFlags": fit.get("morphologyFlags"),
    }


def load_png_meta(
    path: Path,
    height_m: float | None = None,
    morphology_hint: dict | None = None,
    override: dict | None = None,
) -> dict | None:
    if not path.exists() or path.stat().st_size < 200:
        return None
    try:
        im = Image.open(path).convert("RGBA")
    except Exception as exc:
        print("skip png", path, exc, file=sys.stderr)
        return None
    return analyze_still(im, height_m, override=override, morphology_hint=morphology_hint)


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


def tier_meta(
    kind: str,
    pid: int,
    shiny: bool = False,
    height_m: float | None = None,
    morphology_hint: dict | None = None,
    override: dict | None = None,
) -> dict | None:
    base = HOME_OUT if kind == "home" else OA_OUT
    path = base / f"{'shiny/' if shiny else ''}{pid}.png"
    if not path.exists():
        sync_remote(kind, pid, shiny=shiny)
    meta = load_png_meta(path, height_m, morphology_hint=morphology_hint, override=override)
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
        "morphology": meta.get("morphology"),
        "morphologyFlags": meta.get("morphologyFlags"),
    }


def stadium_gif(
    dex: int,
    shiny: bool = False,
    height_m: float | None = None,
    morphology_hint: dict | None = None,
) -> dict | None:
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
    meta = analyze_still(frame, height_m, morphology_hint=morphology_hint)
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
        "morphology": meta.get("morphology"),
        "morphologyFlags": meta.get("morphologyFlags"),
    }


def pack_animated(animated: dict) -> dict:
    keys = [
        "class", "render", "url", "w", "h", "bounds", "frameCount",
        "alphaBounds", "coreBounds", "safeBounds", "padding",
        "visualCenterX", "visualCenterY", "groundY", "anchorType",
        "composition", "morphology", "morphologyFlags",
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

    morphology_hint = resolve_morphology_meta(pid, dex)
    if ovr.get("morphology"):
        morphology_hint = {
            "morphology": str(ovr["morphology"]).upper(),
            "flags": [str(f).upper() for f in (ovr.get("morphologyFlags") or (morphology_hint or {}).get("flags") or [])],
        }

    animated = None
    gif = battle_gif_path(dex, form_id=form_id, shiny=shiny, female=female)
    if gif:
        animated = analyze_gif(
            gif, height_m=height_m, override=ovr, morphology_hint=morphology_hint
        )

    home = tier_meta(
        "home", pid, shiny=shiny, height_m=height_m,
        morphology_hint=morphology_hint, override=ovr,
    )
    oa = tier_meta(
        "official-artwork", pid, shiny=shiny, height_m=height_m,
        morphology_hint=morphology_hint, override=ovr,
    )

    primary = animated
    if not primary and home:
        primary = {**home}
    if not primary and oa:
        primary = {**oa}
    if not primary and not form_id:
        primary = stadium_gif(
            dex, shiny=shiny, height_m=height_m, morphology_hint=morphology_hint
        )

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
        "morphology", "morphologyFlags",
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
    shared_h = min(c["finalScaleH"] for _, c in comps)
    for v, c in comps:
        safe = (v.get("animatedAsset") or v).get("safeBounds") or v.get("safeBounds") or v.get("bounds")
        core = (v.get("animatedAsset") or v).get("coreBounds") or v.get("coreBounds")
        if not safe:
            continue
        aspect = safe[2] / max(1, safe[3])
        inset = c.get("safeInset") or SAFE_INSET
        usable_w = 1.0 - inset["left"] - inset["right"]
        final_h = shared_h
        final_w = final_h * aspect
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


def load_existing_catalog() -> dict | None:
    if not OUT_JS.exists():
        return None
    text = OUT_JS.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"window\.PLAY_POKEDEX_PRESENTATION\s*=\s*(\{.*\})\s*;\s*$", text, re.S)
    if not m:
        # single-line dump
        m = re.search(r"window\.PLAY_POKEDEX_PRESENTATION\s*=\s*(\{.*\})\s*;", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def validate_catalog_or_abort(
    assets: dict,
    previous: dict | None,
    *,
    only_mode: bool,
    allow_shrink: bool,
) -> dict:
    """FAIL-CLOSED against unexpected destructive catalog shrinkage."""
    new_keys = set(assets.keys())
    prev_assets = (previous or {}).get("assets") or {}
    prev_keys = set(prev_assets.keys())
    added = sorted(new_keys - prev_keys)
    removed = sorted(prev_keys - new_keys)
    report = {
        "previousCount": len(prev_keys),
        "newCount": len(new_keys),
        "addedKeys": added,
        "removedKeys": removed,
        "onlyMode": only_mode,
    }
    print(
        "catalog guard:",
        f"prev={report['previousCount']}",
        f"new={report['newCount']}",
        f"added={len(added)}",
        f"removed={len(removed)}",
        f"only={only_mode}",
    )

    if only_mode:
        # Partial rebuild must merge; never publish a subset as the full catalog.
        if previous and len(new_keys) < len(prev_keys):
            print(
                "ABORT: --only rebuild produced fewer keys than the live catalog. "
                "Merge path required; refusing to write.",
                file=sys.stderr,
            )
            print("removed sample:", removed[:20], file=sys.stderr)
            raise SystemExit(2)
        return report

    base_present = sum(1 for d in range(1, 152) if str(d) in assets)
    if base_present < CATALOG_KANTO_BASE:
        missing = [d for d in range(1, 152) if str(d) not in assets]
        print(
            f"ABORT: Kanto base coverage {base_present}/{CATALOG_KANTO_BASE}. Missing {missing[:20]}",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if len(new_keys) < CATALOG_FLOOR_KEYS:
        print(
            f"ABORT: catalog key count {len(new_keys)} below floor {CATALOG_FLOOR_KEYS}",
            file=sys.stderr,
        )
        raise SystemExit(2)

    if previous and not allow_shrink:
        # Unexpected shrink: more than 2% keys removed, or any Kanto base removed.
        shrink_ratio = (len(prev_keys) - len(new_keys)) / max(1, len(prev_keys))
        base_removed = [k for k in removed if k.isdigit() and 1 <= int(k) <= 151]
        if shrink_ratio > 0.02 or base_removed:
            print(
                "ABORT: unexpected catalog shrinkage detected.",
                file=sys.stderr,
            )
            print(f"  prev={len(prev_keys)} new={len(new_keys)} shrink={shrink_ratio:.3f}", file=sys.stderr)
            print(f"  removed={removed[:40]}", file=sys.stderr)
            print("  Re-run with --allow-shrink only for intentional full rebuilds.", file=sys.stderr)
            raise SystemExit(2)

    return report


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
    ap.add_argument("--only", type=str, default="", help="Comma dex/form ids; merges into existing catalog")
    ap.add_argument(
        "--allow-shrink",
        action="store_true",
        help="Permit intentional full-catalog shrinkage (still requires Kanto 151 + floor)",
    )
    args = ap.parse_args()

    forms_js = (ROOT / "js" / "forms.js").read_text(encoding="utf-8", errors="ignore")
    pairs = re.findall(r'"formId"\s*:\s*(\d+)\s*,\s*"dex"\s*:\s*(\d+)', forms_js)
    form_to_dex = {int(fid): int(dex) for fid, dex in pairs if int(dex) <= 151}
    form_ids = sorted({fid for fid, dex in form_to_dex.items() if fid != dex})
    heights = load_heights()
    overrides = load_overrides()
    previous = load_existing_catalog()

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

    # Partial rebuild starts from live catalog and merges updates.
    if only and previous and isinstance(previous.get("assets"), dict):
        assets = dict(previous["assets"])
        print(f"--only merge base keys={len(assets)}")

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

    guard = validate_catalog_or_abort(
        assets,
        previous,
        only_mode=bool(only),
        allow_shrink=bool(args.allow_shrink),
    )

    animated_n = sum(1 for a in assets.values() if a.get("animatedAsset") or a.get("class") == "battle")
    home_n = sum(1 for a in assets.values() if a.get("homeAsset"))
    payload = {
        "version": 6,
        "envelope": {
            "occupancyH": 0.58,
            "occupancyW": 0.78,
            "margin": 0.02,
            "minOccupancyH": MIN_PRESENT_OCC,
            "maxOccupancyH": MAX_SAFE_OCC,
            "refHeightM": REF_HEIGHT_M,
            "refOccupancyH": REF_CORE_OCC,
            "scalePower": SCALE_POWER,
            "safeInset": SAFE_INSET,
            "safeInsetExtreme": SAFE_INSET_EXTREME,
            "maxCoreOccupancy": MAX_CORE_OCC,
            "minCoreOccupancy": MIN_CORE_OCC,
        },
        "priority": ["battle", "home", "official-artwork", "stadium2"],
        "assets": assets,
        "buildStats": {
            "assetsAnalyzed": assets_analyzed,
            "framesAnalyzed": frames_total,
            "catalogGuard": {
                "previousCount": guard["previousCount"],
                "newCount": guard["newCount"],
                "added": len(guard["addedKeys"]),
                "removed": len(guard["removedKeys"]),
            },
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
    g = assets.get("25:10199")
    if g and g.get("composition"):
        print("GMAX PIKACHU fit", g["composition"], "safe", g.get("safeBounds"), "core", g.get("coreBounds"))
    r = assets.get("26")
    if r and r.get("composition"):
        print("RAICHU fit", r["composition"])
    for key in ("130", "95", "148", "24", "6", "6:10196"):
        row = assets.get(key)
        if not row:
            continue
        c = (row.get("animatedAsset") or row).get("composition") or row.get("composition") or {}
        print(
            "MORPH", key,
            c.get("morphology"),
            c.get("morphologyFlags"),
            "desire", c.get("desiredCoreOccupancy"),
            "core", c.get("coreOccupancy"),
            "full", c.get("fullEnvelopeOccupancy"),
            "maxSafe", c.get("maxSafeScaleH"),
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
