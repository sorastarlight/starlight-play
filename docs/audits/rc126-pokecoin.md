# RC126 PokéCoin replacement

Presentation-only. Currency balances, prices, and identifiers are unchanged.

## Original asset

- Path: `images/items/pokecoin.png`
- Archive: `docs/audits/rc126-pokecoin/original-pokecoin.png`
- Kind: 389×389 pixel-art gold coin with a printed **P** (Poké Dollar look)
- Problem: visually poor, not a Pokémon GO PokéCoin

## Replacement asset

- Path: `images/items/pokecoin.png`
- Archive: `docs/audits/rc126-pokecoin/pokecoin-go.png`
- Kind: 48×48 transparent PNG, gold coin with Pikachu silhouette (authentic GO PokéCoin)
- Color type 6 (RGBA)

## Source

PokéAPI does not provide PokéCoins (main-series item sprites only).

PokeMiners `pogo_assets` `Images/Items/` did not contain `PokeCoin.png` / `Item_POKECOIN.png` at the probed paths (404).

Verified download (build/dev time only):

https://gitea.sickgaming.net/CopyBot/PokemonGO-Assets/raw/commit/2a80eb3204817ef2b2e7171ebfa83da999034d73/items-icons/PokeCoin.png

That dump lists `PokeCoin.png` next to `Stardust.png` as GO currency icons. Visual inspection confirmed the GO shop/item coin, not Amulet Coin, Nugget, Gimmighoul Coin, or a generic gold token.

A later copy of the same 48×48 icon (21,135 bytes) was blurrier; the 5,735-byte original-commit file was kept.

Re-import: `node tools/import-pokecoin-asset.js`

## Local destination

`play-site/images/items/pokecoin.png`

Runtime still resolves through `playItemSprite("pokecoin" | "coins")` → `images/items/pokecoin.png`. No hotlink.

## Pages / components updated

Filename is unchanged, so existing references pick up the new art:

- `js/game.js` (`coins` → `pokecoin`)
- `js/store.js` (Mart wallet / department icon)
- `js/inventory.js` (bag wallet)
- `store.html` (`images/items/pokecoin.png`)
- Research / present reward art via `playItemSprite`

CSS: PokéCoin images use `image-rendering: auto` so the GO icon is not forced through pixelated scaling.

## Licensing

Unofficial fan-game presentation of a Pokémon GO currency icon, stored locally like the existing GO Evolution Candy PNGs. Niantic / The Pokémon Company own the original art. Not a substitute for a licensed asset pack.

## Rejected substitutes

- `images/items/amulet-coin.png`
- `images/items/relic-gold.png`
- PokéAPI nugget / big-nugget / coin-case
- The previous pixel **P** coin
