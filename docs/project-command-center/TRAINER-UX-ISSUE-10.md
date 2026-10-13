# Trainer UX polish — issue #10

**Direction:** Proposal A IA, issue #8 visual language, and issue #9 summary-first collection stay. This issue is three usability hits only.  
**Not A1. Not A9. Not A10.** D10 layout and D11 collection still stand. **D12** records artwork + raised nav + full-row directory.

Comparison:

- Before (issue #9): [hub-a-visual-v3.html](./design-reset/hub-a-visual-v3.html)
- After (this issue): [hub-a-visual-v4.html](./design-reset/hub-a-visual-v4.html)

---

## Before / after

| | Visual v3 | Visual v4 |
|---|---|---|
| Collection art | Dex-number tile | Official PNG thumbnail (dex + verified shiny) |
| Detail art | Larger dex tile | Official PNG 128px; same mapping |
| All trainers / Back | Bare text `.back` | Raised StreamLink button (hover lift, press, gold focus, disabled) |
| Directory hit target | Name `<button>` only | Entire row is one native `<button>` |
| Scroll restore | Collection only | Collection **and** directory |

Unchanged: persistent nav; index **or** record; Support doorway; `mons[]` fields; newest 40; no grants.

---

## Artwork source

Local play-site sprites are **GIF** battle sprites at `/images/pokemon/{dex}.gif` and `/images/pokemon/shiny/{dex}.gif`. There are **no local PNGs**. Owner asked for PNG artwork.

Prototype mapping (dex only — no trainer identity in the URL):

1. **Primary:** PokeAPI sprites repo official artwork PNG  
   `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{dex}.png`  
   Shiny (only when `variant` contains `shiny`): `.../official-artwork/shiny/{dex}.png`
2. **Fallback:** canonical local GIF via `/images/pokemon/` using the same shiny/normal split. Never substitute a normal image for a shiny request.
3. **Then:** hide the image and show the dex tile.

Lazy-load, fixed 1:1 frames, `width`/`height`, `alt` = display name + “shiny” when verified. Broken art does not invent a form.

**Future A9 (if authorized):** do not leave production Admin Hub on a GitHub raw dependency. Prefer vendoring these official PNGs next to `images/pokemon/` or reuse `window.playSpriteUrl` (GIF) if PNG packaging is out of scope. Still map only `mons[].dex` + verified `variant`. No sprite RPC.

---

## Raised navigation

Grounded in `css/play.css` `.signin-btn` / `.account-button`: white/pearl fill, 2px `#c9d4ec` border, `0 3px 0` press shadow, 12px radius, min-height **44px**, `cursor: pointer`.

| State | Behavior |
|---|---|
| Hover | Lift 1px, deeper shadow |
| Active | Depress, shadow off |
| Focus | 2px gold outline |
| Disabled | 45% opacity, no lift |
| Reduced motion | No transform/transition |

Used on **All trainers**, **Back to Pokémon**, Find, pager, Admin menu, and hub nav items. Support “Open … with this trainer” and current-hub hrefs stay **text links**.

---

## Full-row trainer selection

A visual header row (not interactive) plus a `<ul>` of full-width `<button class="dir-hit">` entries. No `role="row"` on a button. No nested controls. Tab + Enter/Space native.

Columns stay Trainer / Role / Pass / Pokémon / Last seen. Hit target includes avatar, empty space, and last-seen. **All trainers** restores directory scroll, query, and page.

---

## Honesty

Illustrative Oak / Leaf / Blue only. No Sora, Twinkle, or PlayTester. No `playCall`. External art URLs contain **dex and shiny only**. Browser-tool screenshots still garble Fredoka/Nunito — review at 100% zoom.
