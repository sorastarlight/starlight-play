# A19-GENVAL security corrections (GitHub issue #25 / D38)

**Verdict: BRANCH CORRECTIONS DELIVERED. Production GENVAL apply remains UNAPPROVED.**

Independent review of `b4cf2cc0` required changes before any production apply. This batch stays unapplied SQL + disposable local REAL SQL. `stamp_catch_row` unchanged. No live Supabase execution. No catch writes. No WIRE.

Commit: `67141ec3` on `admin-hub-overhaul`.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL, isolation tests, pin checksums |
| LOCAL HARNESS | JS oracle vs pin level-up slice |
| REAL SQL | Embedded Postgres `127.0.0.1:55433` / `a19_genval` |
| NOT RUN | Hosted Supabase, catch-row SELECT, WIRE, PRODUCTION smoke |

---

## Owner decisions encoded

GV1–GV7 remain locked. D38 refines GV5: production entropy is server `gen_random_uuid` inside `generate_streamlink_mon`. Deterministic md5 exists only on `generate_streamlink_mon_fixture` (REVOKE'd). GUCs are not an authorization or entropy boundary.

Hidden abilities require `issue_streamlink_hidden_ticket` + atomic redeem. `p_allow_hidden`, `hiddenGrant`, and `allowHidden` in JSON are **ignored**.

---

## Review findings and corrections

| Review gap | Correction |
|---|---|
| Validator trusted JSON `hiddenGrant` | Assert requires `p_hidden_auth` of a **redeemed** server ticket. JSON marker ignored. |
| Tickets had no issue/redeem/expiry/replay | `issue_*` + atomic redeem; replay/expiry/ctx mismatch fail closed. Client DML REVOKE + FORCE RLS. |
| GUCs (`genval_mode`, `catcher_nonce`) were trust boundaries | Removed. Production generate ignores `p_seed` and session GUCs. |
| Unguarded `::int` / non-array `jsonb_array_length` | Type-check via `streamlink_json_int`; structured `{ok:false,errors}`; EXCEPTION → `malformed-json`. |
| Moves: null method, no level gate, no duplicates | Required method; form VG; level-up ≤ specimen level; unique IDs; PP vs pin; 0–4 slots. |
| Thin adversarial coverage | 22 matrix cases + REAL SQL forge/replay/wrong-ctx/expiry/GUC/untrusted insert/malformed JSON. |

---

## Artifacts

| Path | Role |
|---|---|
| `supabase/unapplied/a19-genval/001_generate_and_assert.sql` | Functions + ticket table + REVOKE |
| `002_rollback.sql` | DROP functions/table only |
| `DO-NOT-APPLY.md` | Live-apply forbid |
| `tools/lib/a19-genval-oracle.js` | Fixture-mode oracle |
| `tools/a19-genval-rehearsal.js` | Isolated local Postgres |
| `tests/fixtures/a19-genval/matrix.json` | Synthetic + adversarial cases |

Nothing copied into `supabase/migrations/`.

---

## REAL SQL evidence

`node tools/a19-genval-rehearsal.js` — **13/13 PASS** on embedded Postgres 18 at `127.0.0.1:55433/a19_genval` (**NOT** `dtflmlbjhttoewqgkujf`).

| Check | Result |
|---|---|
| Isolation | loopback embedded cluster |
| Schema+seed | 14048 learnsets |
| Functions created | generate, fixture generate, assert, issue, redeem |
| `stamp_catch_row` | absent in rehearsal DB |
| EXECUTE | anon/authenticated **false** on generate/assert/issue/redeem/fixture; no public wrappers |
| Matrix assert | 22/22 fixture expects (L-HA-YES now fail: forged JSON) |
| Fixture generate vs JS oracle | nature/IVs/ability/gender/moves/HP match; `p_allow_hidden` ignored |
| G1/C1 | generate fail `g1-c1-blocked`, no remap |
| Articuno | catch denied; grant friendship 35 |
| Hidden | issue+redeem required; forge / replay / wrong ctx / expiry fail |
| Production entropy | ignores GUCs and caller seeds; two calls differ |
| Untrusted DML | ticket INSERT permission denied |
| Malformed JSON / level 0 | structured fail, no unexpected exception |
| Catch writes | synthetic row IVs/friendship/new cols unchanged |

---

## Remaining risks

- Production apply still needs a separate owner go after this review.
- Future WIRE must be the only caller of issue/generate/assert. Do not GRANT them to `anon`/`authenticated` or wrap them in a public RPC.
- WIRE must never pass a public round id as combat entropy (production generate already ignores `p_seed`).
- `stamp_catch_row` remains live until WIRE.
- Historical catches stay NULL on new columns.
- R2/R18 stay OPEN; this batch does not change production grants.

**STOP** for independent review before any production GENVAL application.
