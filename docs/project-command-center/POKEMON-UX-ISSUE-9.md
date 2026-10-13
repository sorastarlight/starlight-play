# Pokémon collection UX — issue #9

**Direction:** Proposal A IA and issue #8 visual language stay. This is collection information hierarchy only.  
**Not A1. Not A9. Not A10.** D10 layout-in-principle still stands. **D11** records summary-first collection + on-demand detail.

Comparison:

- Before (issue #8): [hub-a-visual-v2.html](./design-reset/hub-a-visual-v2.html)
- After (this issue): [hub-a-visual-v3.html](./design-reset/hub-a-visual-v3.html)

---

## Before / after

| | Visual v2 Pokémon pane | Visual v3 |
|---|---|---|
| Row | Species + ball + **right-aligned Lv. / date** | Identity + dex + verified variant only |
| Action | Static list | Native `<button>` row, hover / gold focus, chevron, Enter / Space |
| Detail | Every field on every row | Dedicated **Back to Pokémon** pane |
| Fields | Mixed display | Only `admin_user_account.mons[]`: species, dex, nickname, variant, gender, level, ball, caughtAt |
| Missing | Sometimes omitted | Explicit **unavailable** |
| Limit | Newest 40 copy | Same. Not a full PC inspector |

Unchanged IA: persistent Admin Hub nav; Trainers index **or** record; All trainers restore; Support doorway; Inventory / Progression / Connections stay as in v2.

---

## Contract (`admin_user_account.mons[]`)

Verified payload: `id, dex, name, nickname, variant, gender, ball, level, caughtAt`. Newest **40** live catches.

| Show | Do not invent |
|---|---|
| Species, dex, nickname (when different from species), variant chip if not `normal`, gender, level, ball, caughtAt | Stats, moves, abilities, sprites, box, favorite, locked, obtain method, ownership, history |

`id` is the row key only. It is not a staff-facing column.

---

## Collection row

1. Dex tile (`#003` style — digits, not a sprite).
2. Title = nickname when it differs from species; otherwise species.
3. Subtitle = `species · #dex` when nicknamed, otherwise `#dex`.
4. Shiny / other verified non-normal variant chip.
5. Chevron. No level. No date. No ball.

The whole row is the hit target.

---

## Detail pane

Replaces the list in the Pokémon tab. **← Back to Pokémon** restores list scroll.

Definition list only (no nested card stack): Species, Pokédex, Nickname, Variant, Gender, Level, Ball, Caught. Compact date + UTC `title`. Unavailable stays muted. Honest footer: fields not in this RPC.

---

## Progressive disclosure (design note only)

Do **not** restructure Proposal A tabs on this issue. Later, if A9 happens:

| Tab | Keep visible | Click-through later (only if a read contract exists) |
|---|---|---|
| Inventory | Coins, bag used/capacity, grouped totals | Itemized stacks. Bits stay unavailable. |
| Progression | Level / XP / title, caught/seen, ranking flags, unlock pills | A title/badge inspector if inspect grows. No trophy wall. |
| Connections | Twitch login + verified flags | Link/unlink stay on Support → current hub. |

---

## Responsive / a11y

1440 / 1024 keep nav + body. 720 / 390 stack. Collection list scrolls inside the pane (`max-height: 360px`) so restore is testable. Focus is 2px gold. `prefers-reduced-motion` still kills animation.

---

## Honesty

Illustrative Oak / Leaf / Blue names only. No Sora, Twinkle, or PlayTester. No `playCall`. Browser-tool screenshots still garble Fredoka/Nunito — review at 100% zoom in a real browser.
