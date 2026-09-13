"""Fetch canonical Kanto species and Berry metadata from PokeAPI.

Writes tools/capture_data.json so the seed migration can be regenerated
without hitting the network again. Safe to re-run.
"""

import json
import os
import urllib.request

API = "https://pokeapi.co/api/v2"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "capture_data.json")

BERRIES = [
    "cheri", "chesto", "pecha", "rawst", "aspear", "oran", "persim", "lum",
    "sitrus", "figy", "wiki", "mago", "aguav", "iapapa", "razz", "nanab",
    "pinap", "bluk", "wepear", "leppa",
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "starlight-play-capture-import/1.0"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def chain_uses_moon_stone(node):
    for detail in node.get("evolution_details", []):
        item = detail.get("item")
        if item and item.get("name") == "moon-stone":
            return True
    return any(chain_uses_moon_stone(child) for child in node.get("evolves_to", []))


def chain_members(node, out):
    out.append(node["species"]["name"])
    for child in node.get("evolves_to", []):
        chain_members(child, out)
    return out


def main():
    species = []
    chain_cache = {}
    for dex in range(1, 152):
        spec = get(f"{API}/pokemon-species/{dex}/")
        mon = get(f"{API}/pokemon/{dex}/")
        chain_url = spec["evolution_chain"]["url"]
        if chain_url not in chain_cache:
            chain = get(chain_url)
            root = chain["chain"]
            chain_cache[chain_url] = {
                "moon": chain_uses_moon_stone(root),
                "members": chain_members(root, []),
            }
        info = chain_cache[chain_url]
        stats = {s["stat"]["name"]: s["base_stat"] for s in mon["stats"]}
        species.append({
            "dex": dex,
            "slug": spec["name"],
            "catch_rate": spec["capture_rate"],
            "types": [t["type"]["name"] for t in sorted(mon["types"], key=lambda t: t["slot"])],
            "base_speed": stats.get("speed", 0),
            "weight_kg": round(mon["weight"] / 10.0, 2),
            "height_m": round(mon["height"] / 10.0, 2),
            "moon_stone_family": bool(info["moon"]),
            "evolution_family": info["members"],
            "is_legendary": bool(spec.get("is_legendary")),
            "is_mythical": bool(spec.get("is_mythical")),
        })
        print(f"{dex:3d} {spec['name']:<12} catch={spec['capture_rate']:>3}")

    berries = []
    for slug in BERRIES:
        berry = get(f"{API}/berry/{slug}")
        item = get(berry["item"]["url"])
        english = next(
            (e.get("short_effect") or e.get("effect") or ""
             for e in item.get("effect_entries", []) if e["language"]["name"] == "en"),
            "",
        )
        flavor = next(
            (f["text"] for f in item.get("flavor_text_entries", []) if f["language"]["name"] == "en"),
            "",
        )
        display = next(
            (n["name"] for n in item.get("names", []) if n["language"]["name"] == "en"),
            slug.title(),
        )
        berries.append({
            "slug": slug,
            "berry_id": berry["id"],
            "item_id": item["id"],
            "item_slug": item["name"],
            "display_name": display,
            "firmness": berry["firmness"]["name"],
            "natural_gift_type": berry["natural_gift_type"]["name"],
            "natural_gift_power": berry["natural_gift_power"],
            "flavors": {f["flavor"]["name"]: f["potency"] for f in berry["flavors"] if f["potency"]},
            "sprite": item["sprites"]["default"],
            "effect": english.strip(),
            "flavor_text": " ".join(flavor.split()),
        })
        print(f"berry {slug:<8} #{berry['id']:<3} {display}")

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"species": species, "berries": berries}, fh, indent=1, ensure_ascii=False)
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
