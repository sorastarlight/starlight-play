# A19-GENVAL branch-only implementation (GitHub issue #25 / D37)

**Verdict: BRANCH IMPLEMENTATION DELIVERED. Production GENVAL apply remains UNAPPROVED.**

Unapplied SQL + disposable local REAL SQL rehearsal only. `stamp_catch_row` unchanged. No live Supabase execution. No catch writes. No WIRE.

Commit: `b4cf2cc0` on `admin-hub-overhaul`.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL, isolation tests, pin checksums |
| LOCAL HARNESS | JS oracle vs pin level-up slice |
| REAL SQL | Embedded Postgres `127.0.0.1:55433` / `a19_genval` |
| NOT RUN | Hosted Supabase, catch-row SELECT, WIRE, PRODUCTION smoke |

---

## Owner decisions encoded

GV1 per-catcher ordinary slots · GV2 per-catcher gender · GV3 fail closed on G1/C1 · GV4 generate level-up / validator any pinned method · GV5 fixture md5 vs production catcher nonce · GV6 JSON + `legacyMoves` only · GV7 public_id deferred.

Hidden abilities require a row in `private.streamlink_hidden_tickets` (REVOKE INSERT from client roles). `p_allow_hidden` is **ignored**.

---

## Artifacts

| Path | Role |
|---|---|
| `supabase/unapplied/a19-genval/001_generate_and_assert.sql` | Functions + ticket table + REVOKE |
| `002_rollback.sql` | DROP functions/table only |
| `DO-NOT-APPLY.md` | Live-apply forbid |
| `tools/lib/a19-genval-oracle.js` | Fixture-mode oracle |
| `tools/a19-genval-rehearsal.js` | Isolated local Postgres |
| `tests/fixtures/a19-genval/matrix.json` | Synthetic cases |

Nothing copied into `supabase/migrations/`.

---

## REAL SQL evidence

`node tools/a19-genval-rehearsal.js` — **12/12 PASS** on embedded Postgres 18 at `127.0.0.1:55433/a19_genval` (**NOT** `dtflmlbjhttoewqgkujf`).

| Check | Result |
|---|---|
| Isolation | loopback embedded cluster |
| Schema+seed | 14048 learnsets |
| Functions created | `generate_streamlink_mon`, `assert_streamlink_legal` |
| `stamp_catch_row` | absent in rehearsal DB (not invented; live copy not touched) |
| EXECUTE | anon/authenticated **false** |
| Matrix assert | 14/14 fixture expects |
| Generate vs JS oracle | nature/IVs/ability/gender/moves/HP match; `p_allow_hidden` ignored |
| G1/C1 | generate fail `g1-c1-blocked`, no remap |
| Articuno | catch denied; grant friendship 35 |
| Hidden | flag ignored; server ticket forces hidden Chlorophyll |
| Production entropy | missing nonce fails; `p_seed = round_id` fails |
| Catch writes | synthetic row IVs/friendship/new cols unchanged |

Corrections during rehearsal: ambiguous PL/pgSQL names; `text[] || text` cast; hidden ticket now **selects** the hidden slot instead of rolling it.

---

## Remaining risks

- Production apply still needs a separate owner go.
- WIRE must `SET LOCAL starlight.catcher_nonce` and never pass `round_id` as `p_seed`.
- Hidden events need a server-side ticket inserter (WIRE), not a boolean.
- `stamp_catch_row` remains live until WIRE.
- Historical catches stay NULL on new columns.

**STOP** for independent review before any production GENVAL application.
