# Mart & Content Studio — future design (not this gate)

**Do not change the Mart, store RPCs, or `admin-store.html` in Gate 1.5 / Gate 2.**  
Live catalog editing stays on `admin.html?section=economy&view=catalog` (`admin-store.html?embed=1`).

Production: `20261008-rc131`. Contracts: Gate 1.5 matrix §6.3.

---

## 1. Current surfaces (REPO)

| Surface | Role |
|---|---|
| Hub Economy → Content Studio iframe | Canonical operator path |
| `admin-store.html` without embed | Redirects to that hub view |
| `js/admin-store.js` | Category/item CRUD, reorder, duplicate, delete, looks |
| `js/admin-studio.js` | Packs, item identity, portraits, Pass rewards, health |
| `js/content-picker.js` | Shared asset/item picker (`admin_content_picker`) |
| `store-asset` Edge Function | JWT + admin; GitHub commit; `admin_store_register_asset` |

Player Mart: `store.html` / buy RPCs — **unchanged**.

---

## 2. Live store RPCs (LIVE SQL)

Read: `admin_store_get` (`require_hub`, STABLE), `admin_content_studio`, `admin_content_picker`, `admin_item_library` (`require_staff_edit`).

Mutate (`require_staff_edit`, anon EXECUTE today): save/reorder/delete/duplicate category+item, save look, register asset, save item identity, look portrait, pass rewards.

**`private.store_items.status text` exists LIVE.** Draft vs published is real. UI already sends `status` / `extra.status` (`published`|`draft`). Duplicate forces draft **REPO**.

Bits SKUs live in store catalog JSON (`store_catalog()->'bits'`). Pass rewards are studio `admin_save_pass_rewards`, not Mart SKUs.

---

## 3. Target IA (Gate 4)

**Mart & Content** tab on admin-next:

1. Catalog list — search SKU / name / floor / kind / `status`
2. Category / floor manager
3. Item editor sections: identity, player copy, grants, price (`cost` PokéCoins, `bits`), availability (`visible`, `featured`, `status`), art, placement (`sort`, `category_id`)
4. Shared asset picker (existing)
5. Draft → Preview → Publish **using `status`**
6. Validation (SKU unique, grant keys known, Master Ball not casually sold)
7. Audit history (does **not** exist today — Gate 3/4 audit contract)

No bulk edit until server supports it.

---

## 4. Special restrictions to preserve

| Rule | Evidence | Design |
|---|---|---|
| Master Ball is real inventory | UI confirm on `admin_grant_bag` when key `masterball` **REPO** | Mart must not silently add Master Ball grants; publish warning if `grants` contains it |
| Bits packs | `admin_grant_bits_pack` + catalog `bits` | Separate from PokéCoin shelf; staff credit remains Support, not Mart |
| Pass | `admin_save_pass_rewards` / `admin_set_pass` | Keep Pass editor out of SKU form |
| Existing entitlements | orders in `private.store_orders` | Changing a live SKU must not rewrite past `store_orders` |
| National dex vs Kanto grants | `admin_grant_pokemon` still 1–151 **LIVE** | Store species grants must stay consistent with server |

---

## 5. Draft / publish workflow

Because `status` is a real column:

1. New item / duplicate → `draft`, `visible=false` recommended
2. Preview = staff-only render using store get (already returns drafts to admins **INFERRED** — confirm in Gate 4 that player catalog hides `draft`)
3. Publish → `status=published` via existing `admin_store_save_item`
4. Unpublish → `draft` or `visible=false` (pick one server rule in Gate 4; do not invent a third state)

Player buy path **UNVERIFIED** in this gate for draft filtering — Gate 4 must prove drafts are not purchasable.

---

## 6. Validation (client preview + server already)

Keep server as authority. UI should block save when:

- SKU empty / collision
- Cost < 0
- Unknown grant keys
- Delete of category that still has items (existing confirm)

Deletes: keep current confirms; add dependency list in Gate 4.

---

## 7. Audit

Today: **no** `account_audit` on store saves **LIVE**. Gate 4 should write `private.account_audit` (or `private.store_audit`) with actor, sku, before/after status/price/grants, no GitHub token.

---

## 8. Gate 2 / 1.5 behavior

admin-next Mart tab remains deep-link only (`admin.html?section=economy&view=catalog`). No save buttons.
