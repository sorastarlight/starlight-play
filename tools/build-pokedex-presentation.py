#!/usr/bin/env python3
"""Build Pokédex presentation assets + visible-alpha bounds metadata.

Prefer Stadium2 high-res frames for base Kanto (1-151) Normal/Shiny.
Forms / female / missing fall back to live battle sprites with bounds.

Does NOT modify encounter battle sprites under images/pokemon/*.gif.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
LIVE = ROOT / "images" / "pokemon"
DEX_OUT = LIVE / "dex"
STAD_N = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Normal)"
STAD_S = REPO / "ASSETS" / "SPRITES" / "POKEMON" / "Pokemon Sprites" / "Stadium2-Animations-(Shiny)"
OUT_JS = ROOT / "js" / "pokedex-presentation.js"
KANTO = range(1, 152)
ALPHA_CUTOFF = 8


def find_gif(base: Path, dex: int) -> Path | None:
    direct = base / f"{dex}.gif"
    if direct.exists():
        return direct
    hits = list(base.rglob(f"{dex}.gif"))
    return hits[0] if hits else None


def opaque_bounds(im: Image.Image) -> tuple[int, int, int, int] | None:
    """Return (x, y, w, h) of non-transparent pixels, or None."""
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    # bbox is (left, upper, right, lower) for non-zero; treat near-transparent as empty
    mask = alpha.point(lambda a: 255 if a > ALPHA_CUTOFF else 0)
    box = mask.getbbox()
    if not box:
        return None
    x0, y0, x1, y1 = box
    return (x0, y0, x1 - x0, y1 - y0)


def best_frame(im: Image.Image) -> Image.Image:
    """Pick the frame with the most opaque pixels (stable presentation pose)."""
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
    return {
        "w": w,
        "h": h,
        "bounds": list(bounds),
        "visW": bounds[2],
        "visH": bounds[3],
    }


def write_png(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)


def battle_paths(dex: int, form_id: int | None = None, shiny: bool = False, female: bool = False) -> list[Path]:
    """Candidate battle sprite paths (gif preferred)."""
    stem_parts = []
    root = LIVE
    if form_id and form_id != dex:
        root = LIVE / "forms"
        if shiny:
            stem_parts.append("shiny")
        if female:
            stem_parts.append("female")
        folder = root.joinpath(*stem_parts) if stem_parts else root
        return [folder / f"{form_id}.gif", folder / f"{form_id}.png"]
    if shiny and female:
        return [LIVE / "shiny" / "female" / f"{dex}.gif", LIVE / "shiny" / "female" / f"{dex}.png"]
    if female:
        return [LIVE / "female" / f"{dex}.gif", LIVE / "female" / f"{dex}.png"]
    if shiny:
        return [LIVE / "shiny" / f"{dex}.gif", LIVE / "shiny" / f"{dex}.png"]
    return [LIVE / f"{dex}.gif", LIVE / f"{dex}.png"]


def load_first_existing(paths: list[Path]) -> tuple[Path, Image.Image] | None:
    for p in paths:
        if not p.exists():
            continue
        try:
            im = Image.open(p)
            frame = best_frame(im) if p.suffix.lower() == ".gif" else im.convert("RGBA")
            return p, frame
        except Exception as exc:
            print("skip", p, exc, file=sys.stderr)
    return None


def main() -> int:
    if not STAD_N.exists():
        print("Stadium2 Normal library missing:", STAD_N, file=sys.stderr)
        return 1

    assets: dict[str, dict] = {}
    built = 0

    for dex in KANTO:
        stad = find_gif(STAD_N, dex)
        shiny_stad = find_gif(STAD_S, dex)
        if not stad:
            print("missing stadium", dex, file=sys.stderr)
            continue
        im = best_frame(Image.open(stad))
        meta = analyze_image(im)
        out = DEX_OUT / f"{dex}.png"
        write_png(im, out)
        entry = {
            "class": "stadium2",
            "render": "auto",
            "url": f"images/pokemon/dex/{dex}.png",
            "w": meta["w"],
            "h": meta["h"],
            "bounds": meta["bounds"],
        }
        if shiny_stad and shiny_stad.exists():
            sim = best_frame(Image.open(shiny_stad))
            sm = analyze_image(sim)
            sout = DEX_OUT / "shiny" / f"{dex}.png"
            write_png(sim, sout)
            entry["shinyUrl"] = f"images/pokemon/dex/shiny/{dex}.png"
            entry["shiny"] = {
                "w": sm["w"],
                "h": sm["h"],
                "bounds": sm["bounds"],
            }
        assets[str(dex)] = entry
        built += 1
        if dex % 25 == 0:
            print(f"stadium base {dex}/151")

    # Battle fallbacks for forms that exist under images/pokemon/forms
    forms_dir = LIVE / "forms"
    form_ids: set[int] = set()
    if forms_dir.exists():
        for p in forms_dir.glob("*.gif"):
            if p.stem.isdigit():
                form_ids.add(int(p.stem))
        for p in (forms_dir / "shiny").glob("*.gif") if (forms_dir / "shiny").exists() else []:
            if p.stem.isdigit():
                form_ids.add(int(p.stem))

    # Also parse PLAY_FORMS from forms.js lightly for dex mapping
    forms_js = (ROOT / "js" / "forms.js").read_text(encoding="utf-8", errors="ignore")
    # "formId":10034,"dex":6
    pairs = re.findall(r'"formId"\s*:\s*(\d+)\s*,\s*"dex"\s*:\s*(\d+)', forms_js)
    form_to_dex = {int(fid): int(dex) for fid, dex in pairs}

    for form_id in sorted(form_ids):
        dex = form_to_dex.get(form_id)
        if not dex or dex > 151:
            continue
        if form_id == dex:
            continue
        loaded = load_first_existing(battle_paths(dex, form_id=form_id))
        if not loaded:
            continue
        _path, frame = loaded
        meta = analyze_image(frame)
        key = f"{dex}:{form_id}"
        assets[key] = {
            "class": "battle",
            "render": "pixelated",
            "url": f"images/pokemon/forms/{form_id}.gif",
            "w": meta["w"],
            "h": meta["h"],
            "bounds": meta["bounds"],
        }
        shiny_loaded = load_first_existing(battle_paths(dex, form_id=form_id, shiny=True))
        if shiny_loaded:
            _sp, sframe = shiny_loaded
            sm = analyze_image(sframe)
            assets[key]["shinyUrl"] = f"images/pokemon/forms/shiny/{form_id}.gif"
            assets[key]["shiny"] = {
                "w": sm["w"],
                "h": sm["h"],
                "bounds": sm["bounds"],
            }

    # Battle bounds for base as fallback metadata (when stadium missing / female)
    for dex in KANTO:
        loaded = load_first_existing(battle_paths(dex))
        if not loaded:
            continue
        _path, frame = loaded
        meta = analyze_image(frame)
        assets.setdefault(str(dex), {})
        assets[str(dex)]["battleFallback"] = {
            "class": "battle",
            "render": "pixelated",
            "url": f"images/pokemon/{dex}.gif",
            "w": meta["w"],
            "h": meta["h"],
            "bounds": meta["bounds"],
        }
        female = load_first_existing(battle_paths(dex, female=True))
        if female:
            _fp, fframe = female
            fm = analyze_image(fframe)
            assets[str(dex)]["female"] = {
                "class": "battle",
                "render": "pixelated",
                "url": f"images/pokemon/female/{dex}.gif",
                "w": fm["w"],
                "h": fm["h"],
                "bounds": fm["bounds"],
            }

    payload = {
        "version": 1,
        "envelope": {
            "occupancyH": 0.72,
            "occupancyW": 0.78,
            "margin": 0.06,
        },
        "assets": assets,
    }

    js = (
        "/* generated by tools/build-pokedex-presentation.py — do not hand-edit */\n"
        "window.PLAY_POKEDEX_PRESENTATION = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n"
        + """
(() => {
  const data = window.PLAY_POKEDEX_PRESENTATION;
  if (!data) return;

  function stamp(url) {
    if (!url) return "";
    const s = window.PLAY_SPRITE_BUILD;
    if (!s) return url;
    return url.includes("?") ? url : `${url}?v=${s}`;
  }

  function pickAsset(dex, formId, shiny, female) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    const key = isBase ? String(id) : `${id}:${fid}`;
    let row = data.assets[key];

    if (female && isBase && row?.female) {
      return { ...row.female, assetKey: key + ":female" };
    }
    if (!row && isBase) {
      // no stadium — try nothing
      return null;
    }
    if (!row) {
      // unknown form — synthesize battle path
      return {
        class: "battle",
        render: "pixelated",
        url: shiny
          ? `images/pokemon/forms/shiny/${fid}.gif`
          : `images/pokemon/forms/${fid}.gif`,
        w: 96,
        h: 96,
        bounds: [0, 0, 96, 96],
        assetKey: key,
        synthetic: true
      };
    }

    if (shiny && row.shinyUrl) {
      const sb = row.shiny || row;
      return {
        class: row.class,
        render: row.render,
        url: row.shinyUrl,
        w: sb.w,
        h: sb.h,
        bounds: sb.bounds || row.bounds,
        assetKey: key + ":shiny"
      };
    }
    if (shiny && row.battleFallback) {
      // shiny stadium missing — battle shiny via playSpriteUrl caller
    }
    return {
      class: row.class,
      render: row.render,
      url: row.url,
      w: row.w,
      h: row.h,
      bounds: row.bounds,
      assetKey: key
    };
  }

  function fitStyle(asset, stageW, stageH) {
    const env = data.envelope || {};
    const margin = Number(env.margin) || 0.06;
    const occH = Number(env.occupancyH) || 0.72;
    const occW = Number(env.occupancyW) || 0.78;
    const [bx, by, bw, bh] = asset.bounds || [0, 0, asset.w, asset.h];
    const availW = stageW * (1 - margin * 2) * (occW / (1 - margin * 2 > 0 ? 1 : 1));
    // Use occupancy against full stage with margin inset
    const innerW = stageW * (1 - margin * 2);
    const innerH = stageH * (1 - margin * 2);
    const targetW = innerW * (occW / 0.88);
    const targetH = innerH * (occH / 0.88);
    // Clamp targets into inner box
    const maxW = innerW;
    const maxH = innerH;
    const tw = Math.min(targetW, maxW);
    const th = Math.min(targetH, maxH);
    const scale = Math.min(tw / Math.max(bw, 1), th / Math.max(bh, 1));
    const dispW = asset.w * scale;
    const dispH = asset.h * scale;
    const visCx = (bx + bw / 2) * scale;
    const visCy = (by + bh / 2) * scale;
    const left = stageW / 2 - visCx;
    const top = stageH / 2 - visCy;
    const occPrimary = Math.max((bw * scale) / stageW, (bh * scale) / stageH);
    return {
      scale,
      left,
      top,
      dispW,
      dispH,
      occupancy: occPrimary,
      css: {
        "--dex-art-w": `${dispW}px`,
        "--dex-art-h": `${dispH}px`,
        "--dex-art-l": `${left}px`,
        "--dex-art-t": `${top}px`,
        "--dex-art-render": asset.render === "pixelated" ? "pixelated" : "auto"
      }
    };
  }

  window.resolvePokedexPresentation = function resolvePokedexPresentation(opts = {}) {
    const dex = Number(opts.dex);
    const formId = Number(opts.formId || dex);
    const shiny = !!opts.shiny;
    const female = !!opts.female;
    let asset = pickAsset(dex, formId, shiny, female);

    // Female/shiny form paths: prefer playSpriteUrl when synthetic or missing file class battle
    if ((!asset || asset.synthetic || (shiny && !asset.url.includes("shiny") && asset.class === "stadium2" && female)) && typeof window.playSpriteUrl === "function") {
      const variant = shiny && female ? "shiny-female" : shiny ? "shiny" : female ? "female" : "normal";
      const url = window.playSpriteUrl(dex, variant, formId);
      if (!asset || asset.synthetic || (female && asset.class === "stadium2")) {
        const fb = data.assets[String(dex)]?.battleFallback || data.assets[`${dex}:${formId}`] || {
          w: 96, h: 96, bounds: [0, 0, 96, 96], render: "pixelated", class: "battle"
        };
        asset = {
          class: "battle",
          render: "pixelated",
          url,
          w: fb.w,
          h: fb.h,
          bounds: fb.bounds,
          assetKey: `battle:${dex}:${formId}:${variant}`
        };
      }
    }

    if (!asset) {
      const url = typeof window.playSpriteUrl === "function"
        ? window.playSpriteUrl(dex, shiny ? "shiny" : "normal", formId)
        : "";
      asset = {
        class: "battle",
        render: "pixelated",
        url,
        w: 96,
        h: 96,
        bounds: [0, 0, 96, 96],
        assetKey: "fallback"
      };
    }

    asset.url = stamp(asset.url);
    const stageW = Number(opts.stageW) || 420;
    const stageH = Number(opts.stageH) || 420;
    const fit = fitStyle(asset, stageW, stageH);
    return {
      url: asset.url,
      assetClass: asset.class,
      renderMode: asset.render,
      sourceW: asset.w,
      sourceH: asset.h,
      bounds: {
        x: asset.bounds[0],
        y: asset.bounds[1],
        w: asset.bounds[2],
        h: asset.bounds[3]
      },
      scale: fit.scale,
      occupancy: fit.occupancy,
      fit,
      cssVars: fit.css,
      assetKey: asset.assetKey
    };
  };

  window.playPokedexPresentationData = data;
})();
"""
    )
    OUT_JS.write_text(js, encoding="utf-8")
    print(f"built {built} stadium bases; assets keys={len(assets)}; wrote {OUT_JS}")
    print(f"dex png dir: {DEX_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
