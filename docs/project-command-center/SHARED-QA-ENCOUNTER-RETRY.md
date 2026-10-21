# CODEX-36 — Approved EmailQA retry: ordinary escape verified

Owner explicitly approved one replacement shared encounter and one ordinary throw after signing the browser back in as EmailQA. This replacement allowance is consumed; no further encounter is authorized.

## Execution and result

Immediately before launch, tab48 visibly showed `Signed in as emailqa`. Hosted preflight found no unresolved rounds and inventory10/5/3. Reused the exact guarded canonical server launch packet from CODEX-35 to avoid the public launch wrapper's automatic scheduling. No code/schema/permissions changed and no owner session was manufactured.

Round **02fadd5c-7493-4570-9e3f-eabd6fed706a**, base Bulbasaur, ordinary `ADMIN_SPECIFIC`, launched01:39:14.843794 UTC October21 /9:39PM October20 EDT. UI actions as EmailQA:

1. Join at01:39:24; read-only check confirmed one participant and zero others.
2. Choose **No item** at01:39:55; no Berry/Honey spent.
3. Choose one owned **Poké Ball** at01:40:28. The normal timer processed the throw at01:40:45.
4. Observe the natural escape at01:41:02. No second click, launch or forced outcome.

Hosted row and capture log agree: `throw_processed=true`, ball `pokeball`, prep `none`, result `Escaped`, chance0.16, roll0.76178958501729, success=false. Round resolved and closed, not cancelled. One capture log, zero catches, zero other participants.

## Economy and boundaries

Item ledger:

| Time UTC | Item | Amount | Reason |
|---|---|---|---|
|01:40:45.167589|Poké Ball|-1|BAG_SPEND|
|01:41:02.076033|Poké Ball|+1|STREAM_ATTENDANCE, linked to this round|

Final ordinary-ball balance remains10; Great Balls5 and Ultra Balls3. This is a normal attendance reward, **not an operator refund**. The failed catch still spent its owned ball correctly. Normal participation/XP/reward side effects are retained under owner approval; no artificial cleanup.

Zero Familiarity events for this round and zero total outbox rows. WIRE remains enabled; Familiarity remains active with cutoff2026-10-20T16:55:59.896904Z. Director remained OFFLINE/held/inactive, no queue, next encounter time null. No delivery, reconciliation, scheduling, reset, APP stamp, real spending, staff-role edit, or protected-account gameplay action.

## Evidence and limits

Evidence files: `shared-qa-retry-launch.json`, `shared-qa-retry-result.json`, `shared-qa-retry-ledger.json`, `shared-qa-retry-familiarity.json`. Actual UI screenshot: `C:/Users/FET/.codex/visualizations/2026/10/19/01a15207-ca1f-7800-95d6-9fb36dc377d5/emailqa-ordinary-throw-escape.png`.

**PRODUCTION PASS for this ordinary join/no-item/owned-ball/escape/economy case.** This does not prove a successful hosted WIRE catch, insertion stamp, PC/Pokédex catch display, Familiarity admission/delivery, all gameplay paths or public admin launch authentication. No explicit replay RPC was called. No runtime code changed, so no new runtime regression suite is claimed.

## Prepared next scope — not authorized

To obtain positive catch evidence without forcing an outcome, a possible next allowance is up to10 ordinary shared Kanto QA encounters, one owned Poké Ball/no item per encounter, stopping at the first natural catch or first error/unexpected participant/session change. Verify EmailQA immediately before each launch. Reuse existing no-scheduling guarded server launch. Keep all normal results/rewards; no refunds, resets, delivery, schedule or stamp. This needs a fresh owner decision; do not execute it from the spent single-retry approval.
