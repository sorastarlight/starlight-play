# A19-GENVAL D39 security corrections (GitHub issue #25)

**Verdict: BRANCH CORRECTIONS DELIVERED. Production GENVAL apply remains UNAPPROVED.**

Independent review of D38 / `67141ec3` required specimen binding, non-destructive production SQL, and local-only fixtures. This batch stays unapplied SQL + disposable local REAL SQL. `stamp_catch_row` unchanged. No live Supabase execution. No catch writes. No WIRE.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL, isolation tests, pin checksums |
| LOCAL HARNESS | JS oracle vs pin level-up slice |
| REAL SQL | Embedded Postgres `127.0.0.1:55433` / `a19_genval` |
| NOT RUN | Hosted Supabase, catch-row SELECT, WIRE, PRODUCTION smoke |

---

## Review findings and corrections

| Review gap | Correction |
|---|---|
| Redeemed ticket could validate a different specimen | Generate binds `specimen_digest` + `specimen_id` atomically. Assert requires `p_hidden_auth` **and** digest(p_mon) match. JSON `hiddenGrant` / `hiddenTicketId` / `hiddenSpecimenId` ignored. |
| `001` started with DROP TABLE/FUNCTION | Production `001` is additive/idempotent. Teardown is `local/000_teardown.sql` + review `002_rollback.sql`. |
| Fixture generate shipped in production SQL | `generate_streamlink_mon_fixture` lives only in `local/010_fixture.sql`. Production-only install creates no fixture entrypoint. |
| Failed generate could consume a ticket | Prepare/lock happens first; bind runs only after a successful specimen is built. |
| Concurrent redeem untested | Two connections; exactly one winner. |

---

## Artifacts

| Path | Role |
|---|---|
| `supabase/unapplied/a19-genval/001_generate_and_assert.sql` | Additive production-shaped install |
| `002_rollback.sql` | Local/review DROP only |
| `local/000_teardown.sql` | Disposable-local DROP |
| `local/010_fixture.sql` | Deterministic fixture generate |
| `DO-NOT-APPLY.md` | Live-apply forbid |

Nothing copied into `supabase/migrations/`.

---

## REAL SQL evidence

`node tools/a19-genval-rehearsal.js` — **15/15 PASS** on embedded Postgres 18 at `127.0.0.1:55433/a19_genval` (**NOT** `dtflmlbjhttoewqgkujf`).

| Check | Result |
|---|---|
| Production-only install | generate/assert exist; fixture generate **absent** |
| Idempotent reapply | tickets survive second `001` |
| Local fixture load | fixture generate created after production install |
| Isolation / stamp / catch writes | loopback; `stamp_catch_row` absent; synthetic catch unchanged |
| Privileges | anon/authenticated/service_role cannot EXECUTE; no public wrappers |
| Matrix assert | 22/22 |
| Fixture generate vs JS oracle | nature/IVs/ability/gender/moves/HP match |
| G1/C1 / Articuno | fail closed / grant friendship 35 |
| Specimen binding | cross-specimen reuse fail; original still pass; post-expiry assert of bound specimen pass |
| Failed generate | ticket remains unredeemed and later succeeds |
| Concurrent redeem | one winner, one replay/unauthorized |
| Production entropy | ignores GUCs and caller seeds |
| Untrusted INSERT / malformed JSON / level 0 | fail closed |

---

## Remaining risks

- Production apply still needs a separate owner go after this review.
- Future WIRE must be the only caller of issue/generate/assert. Do not GRANT them to `anon`/`authenticated`/`service_role`.
- `stamp_catch_row` remains live until WIRE.
- Historical catches stay NULL on new columns.
- R2/R18 stay OPEN; this batch does not change production grants.

**STOP** for independent review before any production GENVAL application.
