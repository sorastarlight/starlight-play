# D84 — Post-install verification plan

**Verdict:** **D84 VERIFICATION PLAN READY — PRODUCTION STAMP STILL BLOCKED**  
**Status:** Planning only. No hosted call and no SQL change.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `677b7b9c`  
**Work commit:** `5b4f57cc`  
**Production APP:** `20261008-rc133` (unchanged).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

Historical GO text in D78–D83 is evidence, not approval. The “Do not start D84” line in the D83 report stays there. Do not start D85.

## What D83 proves

D83 replaced only `private.round_is_active(encounter_rounds)` on `dtflmlbjhttoewqgkujf`. The hosted prosrc md5 is `53d7e8a3f3894212e854618dc0663101`, the same md5 D81 recorded after applying `001_round_is_active.sql` on local PostgreSQL. Owner, signature, language, security invoker, stable volatility, parallel unsafe, null `proconfig`, and null `proacl` stayed. Lifecycle remained `inactive`, WIRE remained disabled, and `settle_if_needed` stayed `565c102d0a8c84a3dfd036653aca307c`. No round was opened.

D81 already ran that body: 17/17 REAL SQL on `127.0.0.1:55451`. Null is inactive. Join, prepare, throw, and reveal with null optional columns are active. A second launch raises. Pause, cancel, and gift in that rehearsal were control-flow models, not the hosted function bodies. Production settlement, odds, and spending were not executed.

## What remains untested

The hosted function has not been called, so nobody has watched the live database return true for an ordinary open row. That gap is closed by the fingerprint match to the D81 rehearsal, not by another copy of the same script. Re-running D81 would repeat a finished audit.

These hosted behaviors are still unobserved: a second launch raising, staff pause, cancel and refund, gift-joined, and the director tick pausing an open round during an ad. D82 already mapped those paths. They do not need a new audit before the stamp decision.

The PlayerQA stamp is still blocked. D78 did not throw. D79 found one global `latest_round`, no allow-list, and cancel that restores every participant. D80 rejected a production QA lane and a narrower production insert. The D83 install does not change that selector.

## Recommended next step

Do not open a production round. The launch guard does not need another production test to be considered installed and locally rehearsed.

If the owner wants the stamp proven, the next step is D80 Option 2: one catch on a disposable database that is not `dtflmlbjhttoewqgkujf`, using the canonical `settle_if_needed`, the stamp trigger, and this installed `round_is_active` body. A local model that stubs settlement cannot count as the stamp. A public or hand-built production insert still cannot be limited to PlayerQA.

An optional smaller check, a read-only call of the installed function on a non-persisted row, would only repeat the D81 expression result on PostgreSQL 17.6. It is not the stamp, and it is not part of this plan's required next step.

## Isolation and stop conditions

The disposable database must not be the live project and must not use live trainer credentials. Use one synthetic trainer. One ordinary Poké Ball. Real odds. No forced catch or escape. No shortened timers. No second catch engine.

Stop if `settle_if_needed` or the stamp trigger cannot be matched to the hosted bodies. Stop if the rehearsal would connect to `dtflmlbjhttoewqgkujf`. Stop if another trainer can join, or if cancel would refund anyone except the synthetic trainer. Stop on any error instead of repairing it with a production write. Do not activate Species Familiarity even if `server_inserted_at` is present. Do not build a QA lane on the live project.

## Owner decision

This block is not approved.

```text
OWNER GO — disposable stamp rehearsal only. Not yet approved.

Database: a new disposable Postgres, not dtflmlbjhttoewqgkujf.
Load canonical settle_if_needed, the stamp trigger, and the installed
round_is_active body (prosrc md5 53d7e8a3f3894212e854618dc0663101).
One synthetic trainer. One ordinary Poké Ball. Real odds. No forced outcome.
Do not use PlayerQA, Sora, Twinkle, or PlayTester.
Stop if those function bodies cannot be matched.
Do not activate Species Familiarity.
Do not build a production QA lane, deploy, merge, or stamp APP.
```

No other decision is required to leave the live project as D83 left it.

Do not start D85.
