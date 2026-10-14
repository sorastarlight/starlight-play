# A19-APPLY decision packet (GitHub issue #24 / D33)

**Verdict: UNAPPROVED.** Backup evidence is **recorded**. A19-APPLY is **not** authorized.

This packet is not permission to migrate. No production SQL was executed. No backup was created or restored. Staged SQL was **not** copied into `supabase/migrations/`. GENVAL / WIRE / reset / merge / deploy were not started.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

---

## Confirmed vs unavailable

| Item | Class | Status |
|---|---|---|
| Project `dtflmlbjhttoewqgkujf` / PG 17.6 | LIVE CATALOG (#24) | **Confirmed** |
| `public.catches` missing all 17 staged columns | LIVE CATALOG (#24) | **Confirmed** |
| No `private.ref_*` tables | LIVE CATALOG (#24) | **Confirmed** |
| PostgREST does not expose `private` (`PGRST106`) | LIVE API (#24 follow-up) | **Confirmed** |
| Org plan Pro (docs: daily backups, 7-day retention) | LIVE PLATFORM (#24) | **Confirmed** (eligibility only) |
| Pin `sl-ref-20261013-227b573` + seed checksums match disk; unchanged since #23 `cc66946b` | STATIC | **Confirmed** |
| Isolated rehearsal 17/17 | REAL SQL (#23, localhost) | **Confirmed** (synthetic only) |
| Latest **COMPLETED** daily backup | OWNER REPORT (this batch) | **Recorded:** `2026-10-14 07:44:26 +0000` |
| PITR add-on | OWNER REPORT (this batch) | **Recorded:** **PITR disabled** |
| Named restore target | OWNER REPORT | **Recorded:** that COMPLETED snapshot |
| Management API backup inventory / backup UUID | — | **Not independently listed** |
| Explicit A19-APPLY go | Owner authorization | **Not given** |

Backup evidence gate is **cleared** for O2/O3. Apply authorization (O4) is **not**. This is not LIVE PLATFORM listing of backups; the agent did not open the Dashboard or call restore.

---

## Owner evidence (D33)

Recorded from the owner, 2026-10-14:

- Latest COMPLETED scheduled backup: **14 Oct 2026 07:44:26 (+0000)**
- PITR status: **PITR disabled**

Checks vs the asked packet: COMPLETED (not running/failed), date, time, timezone, and an explicit PITR disabled/enabled answer. **Complete enough to name a restore target.** Residual: no backup UUID; not re-listed via Management API.

Still required before any apply: a **separate** message approving `001` → seed `00`–`10` → `002` only. Do **not** click Restore now.

If apply slips past the next daily backup, re-record the newest COMPLETED timestamp before that go. This snapshot is stale the moment a newer COMPLETED row appears.

---

## Recovery and data-loss risk

PITR is **disabled**. A failed apply can be undone only by restoring the **entire Postgres database** to the named daily snapshot. There is no restore-to-a-second-before-apply.

Restore target **T** = `2026-10-14 07:44:26 UTC`.

| Lost if restored to T | Not in that DB backup |
|---|---|
| Every committed Postgres write after T: catches, trades, Oak transfers, GTS, inventory, PokéCoins, Pass claims, encounter/director/stream rows | Storage objects |
| Trainer rows changed after T, including protected accounts if they had activity after T | Snapshots older than Pro’s ~7-day window |
| Any schema applied after T (including a failed A19-APPLY) | — |

That window **grows** until restore. At packet time (2026-10-14 ~15:20 UTC) it was already **about 7.5 hours**. By the next daily backup it can approach a full day of live play.

Restore takes the project **offline**. You cannot restore one table. `003_rollback.sql` only drops `private.ref_*` and the 17 new catch columns; it does not rewind player activity. After GENVAL fills those columns, `003` is data-loss. Storage can desync from a DB restore.

Do not restore to “try” apply. Do not release Pokémon to compensate for a restore.

**Go/no-go:** technical preflight and a named daily restore target are in place. Rollback cost is **whole-database rewind to 07:44:26 UTC**, not surgical. A19-APPLY remains **UNAPPROVED** until a separate explicit owner go.

---

## Artifact pin (STATIC — this batch)

`appliedToSupabase: false`. Files remain under `supabase/unapplied/a19-schema/` only. Last SQL change: `cc66946b` (#23 `evo_uid` fix). Git diff of DDL + seed + `data/gen9-ref/` vs that commit: **empty**.

Pin: `sl-ref-20261013-227b573` (220 resolved / 16 unresolved learnsets).

### DDL

| File | SHA-256 | Bytes |
|---|---|---|
| `001_private_ref_tables.sql` | `61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30` | 9704 |
| `002_catches_nullable_extensions.sql` | `855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932` | 4504 |
| `003_rollback.sql` | `54fd5c6f69239a9ef81aae7051c255a3c5f1e97b891f5045994752f5cc840208` | 2627 |

### Seed (`seed/manifest.json`)

Counts: 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16.

| File | SHA-256 |
|---|---|
| `00_meta.sql` | `0e1236efef5bd8f9f541956153efb6e3555cdc832bc049db193008619fdbb035` |
| `01_natures.sql` | `2b9b56e9ce7a2ab15f518ddb68ed619b2a1da41e66d9e6baf739831550b86887` |
| `02_species.sql` | `432a02d1aeadf5830c07e4c17f33dcb8304c419af7d5d2c41faef43e393e02df` |
| `03_forms.sql` | `f56270f767cea9e1ee883b1a23bbc9631dd0cc2b63ef089b55b2edb7490f77eb` |
| `04_abilities.sql` | `d89f364aee41847d60fd8c881e37bc78bafc5fbf9ed60e981ceebc05a6dbadad` |
| `05_form_abilities.sql` | `366a194f603df3e1489f14e34d902ff7cf8020cb2b22cec992ee778a2ef64c7a` |
| `06_moves.sql` | `59fc4f77d0a8035ec2a91335191162374fc6188097454afb83c069995431a7c3` |
| `07_learnsets.sql` | `17a897b0c7164fb1debed99226bda7a9f320fd1f4d3decf81ece40f0662bcdcd` |
| `08_evolutions.sql` | `b2a4f61b1141ab8f7714ef9ce1a1486d54a231f39cc7597a7e6380a6e4761950` |
| `09_obtain.sql` | `7d5cc899974cd2e086d79d313c9f287dd9588e02f244cd0460d25fc5ae787592` |
| `10_form_policies.sql` | `6aa483ec4f468b56bc81448ae57e616fa310a5785c058f5cb925003c799c0e5a` |

### Pin JSON (`data/gen9-ref/manifest.json`)

| File | SHA-256 |
|---|---|
| `meta.json` | `4aa8c4ec4efb2a233f3e03a6050c46d5417fdf67bc585e6c9dfe3fb19395ae17` |
| `natures.json` | `5b5147de6aa14702ef4850a6f089944887a73a6dc0a20d21412492d3b8f6ca92` |
| `species.json` | `ef25275fdadb77ed225860d8e0c304ccfd0c62d6bb3043fcc89b33c66d6ac51e` |
| `forms.json` | `96aec26e0df284470a318ed60a0c980a61ab50ee15b86c32f745c1141dc05cef` |
| `form-abilities.json` | `fc34e96f3c4178878b0c032a3089d8c5ad6b7ddcf0dd033f21273d0fc6c1e702` |
| `abilities.json` | `22112023de4292d13a070979caa3f2c71b8fabe26b49109316bf17b63230a58b` |
| `moves.json` | `57cd755529938f2cf580e0d21175f04608d0b582f1b0a978017c3373f66accf2` |
| `learnsets.json` | `d868a5b83b32ac24bb3f1a0d5c576d1b3422751ebede7d1f29079829019273f4` |
| `evolutions.json` | `59b7ab1f27ae0edfdac1f66e3731b592b7090d242e6d5b48d04dbd10fd513392` |
| `obtain.json` | `8546444050afa5a806e22131a013f14596a38101eb2f66eca19c42e83acf879c` |
| `exceptions.json` | `84d8ee270cb4ffacd3944b121ddb140883f21527fa5ced7c1d99a259f6efc722` |
| `coverage.json` | `c9edf642372f71173738decb0dc4832185a35241376a784bdbb29612ef6e5346` |
| `manifest.json` | `18f7bec85375b5631fcf0814452af54b515273c4257ccc3bfd7a0a78dd99231c` |

If any later edit changes these hashes, this packet is stale.

---

## Schema-only apply sequence (prepared, not authorized)

Keep files in `supabase/unapplied/a19-schema/` until a future A19-APPLY explicitly says to copy them into a **new** migration timestamp after `20261011024514_gate_2a_r_identity_inspect_true_read`. Do not reuse #20/#21 drafts.

Idle the stream if practical. Then, only after a separate explicit **A19-APPLY** go (O4). Re-check that the newest COMPLETED backup is still `2026-10-14 07:44:26 +0000` or record the newer one:

1. `001_private_ref_tables.sql`
2. `seed/00_meta.sql`
3. `seed/01_natures.sql`
4. `seed/02_species.sql`
5. `seed/03_forms.sql`
6. `seed/04_abilities.sql`
7. `seed/05_form_abilities.sql`
8. `seed/06_moves.sql`
9. `seed/07_learnsets.sql`
10. `seed/08_evolutions.sql`
11. `seed/09_obtain.sql`
12. `seed/10_form_policies.sql`
13. `002_catches_nullable_extensions.sql`

**Do not run:** `003_rollback.sql`, `preflight/000_metadata_only.sql` as a migration, `rehearsal/000_synthetic_baseline.sql`, GENVAL, WIRE, any catch UPDATE, `NOTIFY pgrst` to add `private`, GRANT of `ref_*` to `anon`/`authenticated`.

Expect: nullable `ADD COLUMN` on ~110 estimated catch rows, CHECK scan, 14,048 learnset inserts. Leave `stamp_catch_row` unchanged. New catch columns stay NULL.

---

## Post-apply verification (catalog only — do not run now)

After a future approved apply, smoke with metadata only:

1. `private.ref_*` row counts for `content_build = 'sl-ref-20261013-227b573'` equal 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16.
2. RLS on; no anon/authenticated SELECT on `ref_*`.
3. `information_schema.columns` shows the 17 new `public.catches` names, all nullable. Live `iv_*` / `moves` / `friendship` names unchanged.
4. LIVE API `Accept-Profile: private` still **406 PGRST106**.
5. `appliedToSupabase` in git pin JSON stays a documentation flag until a later batch updates it; do not treat the JSON flag as a database lock.

**No** `SELECT` of catch rows. **No** RPCs. **No** GENVAL.

---

A19-APPLY remains **UNAPPROVED**. Final handoff: [GEN-IX-APPLY-HANDOFF.md](./GEN-IX-APPLY-HANDOFF.md) (D34, **BLOCKED** on missing GO/NO-GO).
