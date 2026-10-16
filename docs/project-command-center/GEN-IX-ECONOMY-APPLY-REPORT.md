# D55-ECONOMY-APPLY result (D57)

**Verdict: INSTALLED.** Catalog-only verification passed. No throw, catch-row read, or inventory backfill was performed.

Migration `20261016042345` `d55_economy_001_spend_rules` on `dtflmlbjhttoewqgkujf` as `postgres`, one transaction.

File `supabase/unapplied/d55-economy/001_spend_rules.sql`  
SHA-256 `fdf5fffb50ed333d860711d127423364331de1dc0c0b7a1690b893908f36d1aa`

The D54 file was not applied.

## Before install

| Check | Result |
|---|---|
| SHA-256 | Match |
| Project `dtflmlbjhttoewqgkujf` | Match |
| Role `postgres` | Match |
| `private.spend_bag_item` `adb53e0a30a06224d85fa79a50d1f433` | Match |
| `private.announce_throws` `6abe25af4ac01e2e9c97707c3d8e44cf` | Match |
| WIRE | `enabled=false` |

## After install

| Object | `src_md5` | Check |
|---|---|---|
| `private.spend_bag_item` | `5419a99d0c1735f44564b84338e32578` | `BAG_SPEND`, `NB001`, atomic berry and extra-ball updates |
| `private.announce_throws` | `0cd4a8e2a647ba388ce19b14b6f5a8c4` | `standard_throw` skip kept; catches only `NB001`; no `WHEN OTHERS` |
| `public.play_throw` | `c88c65372df551e1e06e7d819af2f167` | Unchanged |
| `private.capture_chance` | `8fa515e574a89165c0adf11339ed73ba` | Unchanged |
| `private.grant_items` | `78553b9a85ebbda73c78f5d1c0da1156` | Unchanged |
| `private.settle_if_needed` | `824058b4fbb4529163c589a41df63775` | Unchanged |

Both replaced functions stay owned by `postgres` and security invoker. WIRE `enabled=false`. APP `20261008-rc133` unchanged.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. `SL00025376` was not read or modified.

No RESET-GO, restore, merge, or deploy.
