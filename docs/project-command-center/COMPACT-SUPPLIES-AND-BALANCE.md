# Compact supplies and proposed reward split

October 27, 2026. The owner requested presentation fixes and a reward-pool recommendation. **Reward changes below are a proposal only.** No reward amounts, eligibility, stored bundles or claims are changed by this frontend work.

## Presentation implementation

- Smaller Pass/Oak spacing and calendar tiles; reward lists remain independently scrollable and claim footers retain aligned grid rows regardless of reward count.
- Server-designated today has a green border/background and explicit Today label matching Oak's supplies. A future activation date is never relabeled today.
- Tomorrow's Reward! / Soon~ / Unclaimed tile labels; claimed and saved-to-PC states remain distinct. Future preview action says Not Available Yet and stays disabled.
- Requested Oak header; Research Notes expanders removed.
- Empty summaries suppressed. Saved gift-box notices get the provided artwork, an explanation and PC link, without inventing a grant.
- My PC nav dot is an account-scoped hint from an existing delivery notice or authorized PC response. It clears when a refreshed PC response has no boxes. No new background/materializing endpoint calls. It does not promise a cross-device real-time count; another device updates when its existing notices/PC data arrive.
- New supplied PNG replaces the shared gift-box asset.

LOCAL verification: 187 regression suites, build and 96 recovery-file checks; four rendered widths 320/390/768/1024 with no document overflow; future preview disabled/Close focus return; real reveal engine gift-box notice with art/copy/link. No hosted application calls or live rewards.

## Current balance assessment

Current ordinary Oak daily supply is Poké Ball x3, common Berry x1 and 40 coins, plus existing streak extras. Its new seven-day gift adds 10 chosen Candy, 150 coins, a stone and rare ball. Catch Candy is 3/5/8 by evolution stage; evolution costs 15–100. Thus 10 chosen Candy is substantial directed progression (two-thirds of the cheapest evolution), in addition to premium items.

Pass provides one rotating item +50 coins daily and seven physical items +150 coins weekly. Current active rotation prices range 250–500 per main daily item. Existing recorded bundles may contain old items until their recorded periods finish. Catalog values measure replacement cost, not actual spend, catch guarantees, rarity probabilities or real-money value.

The overlap is Oak's stone/rare-ball completion gift and legacy premium extras. I recommend keeping Oak useful for free participation while making Pass the dependable rare-item source. Do not remove already earned gifts or rewrite snapshots.

## Proposed Oak

Daily: Poké Ball x2, one common Berry x1, 20 coins. Berry pool: Oran, Cheri, Chesto, Pecha, Rawst, Aspear. Do not add legacy Great/Ultra/Honey/Razz extras on top.

Seven consecutive days: choose 5 Evolution Candy for an available family +75 coins. Keep the Candy-pack presentation. Remove automatic weekly stones and rare balls from future Oak rewards. Five Candy is one-third of the minimum 15-Candy evolution, supporting progression without replacing captures/transfers. Earned prior gifts stay intact.

## Proposed Pass

Daily: one item x1 +50 coins. No repeated main item within a week. Four example weeks:

| Week | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| 1 | Figy Berry | Moon Ball | Fire Stone | Silver Pinap Berry | Ultra Ball | Wiki Berry | Quick Ball |
| 2 | Mago Berry | Hisui Ultra Ball | Water Stone | Silver Pinap Berry | Dusk Ball | Aguav Berry | Jet Ball |
| 3 | Iapapa Berry | Gigaton Ball | Thunder Stone | Silver Pinap Berry | Heavy Ball | Figy Berry | Moon Ball |
| 4 | Wiki Berry | Ultra Ball | Leaf Stone | Mago Berry | Repeat Ball | Aguav Berry | Golden Razz Berry |

Moon Stone/Linking Cord can replace the stone in later rotations, keeping one evolution item per week rather than adding it on top. No common berries, plain Poké Balls, cheap collector reskins, avatar packs, bag capacity, Pokémon or Master Balls as main daily rewards.

Weekly: retain seven physical items +150 coins, with useful specialty balls replacing cheap collector reskins:

| Week | Physical contents | Catalog replacement value including coins |
|---|---|---:|
| 1 | Great Ball x2, Lum Berry x2, Honey x1, Poké Radar x1, Moon Ball x1 | 1,430 |
| 2 | Hisui Great Ball x2, Sitrus Berry x2, Honey x1, Poké Radar x1, Dusk Ball x1 | 1,430 |
| 3 | Wing Ball x2, Persim Berry x2, Honey x1, Poké Radar x1, Heavy Ball x1 | 1,430 |
| 4 | Leaden Ball x2, Lum Berry x2, Honey x1, Poké Radar x1, Quick Ball x1 | 1,455 |

Oak's proposed basic daily package has about 280 coins of replacement value (2x100 ball +60 berry +20 coins), 1,960/week before the Candy gift. Pass daily items alone are 300–550 including coins, plus the weekly drop. This gives Pass a clear useful-item advantage without exclusive guaranteed catches, XP multipliers or stat advantages. Free trainers retain normal catches, trade, Mart and evolution progression.

## Bits

Existing published packs deliver 14–21 physical items and catalog replacement value starts at 1,540. Proposed weekly Pass drops stay below the smallest existing Bits pack by both bulk and listed value. Bits should remain immediate larger bundles. A month of earned subscription supplies naturally exceeds a single small Bits purchase; do not imply every Bits pack exceeds a month of Pass. No Bits price/provider changes proposed. Long-term inflation and item usefulness still need player observation; catalog math is an initial guardrail.

Activation of the rebalance requires an owner decision and exact tested SQL/config migration. Preserve accrued gifts, verified-period policy, whole-bundle Bag-first delivery, overflow boxes and owner-only testing exception.

Publication: main `370a21bf3b2ba5acd07aa4a520cd18f98b49b6c9`, Pages `40552441282`; all eight deployed files match reviewed source. Frontend only; no hosted claims, application calls or SQL. APP unchanged.
