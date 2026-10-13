# Visual style guide — issue #8

**Direction:** Proposal A IA stays. This is look-and-feel only.  
**Not A1. Not A9.** Structural acceptance in principle is **D10**.

Comparison:

- Before (issue #7): [hub-a.html](./design-reset/hub-a.html)
- After (this issue): [hub-a-visual-v2.html](./design-reset/hub-a-visual-v2.html)

---

## Before / after

| | Issue #7 `hub-a.html` | Visual v2 |
|---|---|---|
| Type | system-ui, 13/20 | Play site **Nunito** body + **Fredoka** titles |
| Color | Warm taupe `#f6f1ec` / `#2a1f28` | Play pearl / navy / sky / starlight pink from `css/play.css` |
| Shell | Flat grey frame | Soft pearl canvas, 20px radius, pink/sky wash behind the stage |
| Nav | White column, pink tint | `#fff7fb → #eef6ff` (same family as `.hub-nav`) without the gold 3px carnival border |
| Table | Hairline rows | Hover `#fff7fb`, focus gold wash, uppercase 11px headers |
| Status | Text chips | Pass = pink soft; LIVE = sky chip + pulse (Twitch snapshot only, not “trainer online”) |
| Record | Bare definition lists | Fact tiles, mon rows with dex tiles (not sprites), bag bar from verified used/capacity |
| Motion | None | 160ms hover / 180ms pane rise; `prefers-reduced-motion: reduce` kills both |
| Viewports | 1440 / 390 | 1440 / 1024 / 720 (200% of 1440) / 390 |

Unchanged IA: persistent Admin Hub nav; Trainers index **or** full-width record; All trainers restore; Support doorway with trainer context; same verified fields; no grants.

---

## Tokens (from `play.css`, restrained for admin)

| Token | Value | Job |
|---|---|---|
| Ink | `#3a3f63` | Body |
| Muted | `#6b6c84` | Meta, compact dates |
| Pearl | `#f4f7ff` | Main canvas |
| Pink / deep / soft | `#c04878` / `#8a3d72` / `#ffe3f3` | Pass, current nav, primary Find |
| Sky / soft | `#6aa8ef` / `#d9ecff` | LIVE, dex tiles, bag fill start |
| Gold | `#c9a227` | `:focus-visible` only |
| Line | `#dce3f2` | Horizontal rules |
| Radius | 12–14px controls, 20px shell | Play rounding without 22px gold boxes |
| Space | 8 / 12 / 14 / 20 | Controlled, not empty cards |

Site background wash (pink + sky radials on `#f5f8ff`) sits **behind** the hub frame so the prototype belongs to StreamLink. The frame itself stays pearl/white for staff reading.

---

## Components

| Piece | Behavior |
|---|---|
| Brand | Fredoka “Admin Hub” + 10px pink/sky pip. Not a logo banner. |
| Nav item | Transparent; current = pink gradient fill (Play selected tab). |
| Find / pager | White, 2px `#c9d4ec`, 3px press shadow (`.signin-btn` family). |
| Directory row | Real `<button>` name. Hover pink wash. Focus gold wash. Same five columns. |
| Fact tile | White, 14px radius, Fredoka value. `unavailable` uses muted, never a fake number. |
| Mon row | Dex tile `#003` style — letters/numbers only. Shiny is a Pass-pink chip on verified `variant`. |
| Unlock pill | Soft pink when unlocked, outline when locked. All / Unlocked / Locked filter. |
| LIVE chip | Sky + pulse. Used only for verified Twitch/RPG snapshot words. |
| Door | Soft pink/sky panel. Links only. No grant buttons. |

---

## Motion

- Allowed: row/nav hover 140–160ms, pane enter 180ms translateY(6px), LIVE pulse 1.6s, Find press (shadow drop).
- Forbidden: looping page animation, fake activity charts, sprite bounce, confetti.
- `prefers-reduced-motion: reduce` → no animation or transition.

---

## Responsive

| Frame | Layout |
|---|---|
| 1440 / 1024 | Nav + body. Trainers table **or** record. |
| 720 (200% of 1440) and 390 | Admin menu. Stacked directory cells. Facts 2-up. |

No extra columns. No horizontal table scroll. Overflow is a defect.

---

## Accessible states

| State | Presentation |
|---|---|
| Loading | Status text; keep prior directory rows when that demo is used |
| Empty | “No trainers match.” |
| Denied | Staff-only copy; no data dump |
| Focus | 2px gold outline |
| Contrast | Navy titles on pearl; muted never used for primary names |

---

## Honesty

Illustrative Oak / Leaf / Blue names only. No Sora, Twinkle, or PlayTester. No `playCall`. Browser-tool screenshots still garble Fredoka/Nunito — review at 100% zoom in a real browser.
