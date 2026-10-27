# Berry type bonuses

Status, October 26, 2026: **implemented and tested locally; not activated in production.** This replaces the historical first-draft mapping. Existing item drops and PC storage are installed separately.

Each specialist retains its rarity boost. Matching either Pokémon type adds a 10% relative multiplier, once. A mismatch has no penalty. Regional forms use their own types. Wiki fills the previously unassigned Steel specialist role; Sitrus, Razz, Silver Pinap and Golden Razz are universal.

| Berry | Type | Normal multiplier | Matching multiplier |
| --- | --- | ---: | ---: |
| Oran | Water | 1.05 | 1.155 |
| Aspear | Ice | 1.05 | 1.155 |
| Bluk | Dark | 1.05 | 1.155 |
| Cheri | Fire | 1.05 | 1.155 |
| Chesto | Ghost | 1.05 | 1.155 |
| Leppa | Fighting | 1.05 | 1.155 |
| Nanab | Flying | 1.05 | 1.155 |
| Pecha | Fairy | 1.05 | 1.155 |
| Pinap | Electric | 1.05 | 1.155 |
| Rawst | Grass | 1.05 | 1.155 |
| Wepear | Poison | 1.05 | 1.155 |
| Lum | Dragon | 1.10 | 1.210 |
| Persim | Normal | 1.10 | 1.210 |
| Aguav | Bug | 1.15 | 1.265 |
| Figy | Rock | 1.15 | 1.265 |
| Iapapa | Ground | 1.15 | 1.265 |
| Mago | Psychic | 1.15 | 1.265 |
| Wiki | Steel | 1.15 | 1.265 |
| Sitrus | Universal | 1.10 | 1.10 |
| Razz | Universal | 1.15 | 1.15 |
| Silver Pinap | Universal | 1.20 | 1.20 |
| Golden Razz | Universal | 1.30 | 1.30 |

At a 20% pre-berry chance, a common berry gives 21%, or 23.1% with a type match. A 1.15 specialist gives 23%, or 25.3% with a match. Golden Razz gives 26% against any type. These are relative increases, not percentage-point additions. The 2% floor and 85% cap remain; Master Balls remain guaranteed. Pinap coin bonuses stay unchanged. Color/flavor associations are design choices, not canonical berry mechanics.

All 22 existing berries become catch-enabled, adding nine previously disabled choices without changing purchase availability or price. Descriptions change atomically with mechanics. The local Mart text correction displays server descriptions instead of generic summaries.

## Integration and verification

The disposable PostgreSQL 17 rehearsal passes **37 check groups**, including 236 pinned forms × 22 berries, actual encounter settlement, WIRE specimen creation and capture-log delivery. It checks successful catches, escapes, failed item rolls, retries/concurrent receipt requests and all 60 drop keys.

Overflow remains: bag space first, then a stack in the 30-type PC box, then a safely waiting type. Pending types are promoted when a slot opens. Stored items cannot be spent until withdrawn. A successful catch and an escape were both settled locally with the bag and box full; rewards were preserved. Rollback restores prior function/catalog values without removing earned items or receipts.

All **168 regression suites** and build validation pass. These are local results, not hosted gameplay acceptance or long-term economy measurements. The 100,001-point XP drop-probability checks also pass; drop odds and rarity pools were not changed.

Packet: [berry-affinity README](../../supabase/unapplied/berry-affinity/README.md). Production SQL, related frontend publication and a real encounter test have not run. Source guards stop on drift. No protected accounts, balances, credentials or live inventories were changed.
