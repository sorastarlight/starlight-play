# D51 — proposed A19-WIRE-GO (not approved)

PlayTester is the disposable QA login. Site-only email/password. Nonstaff. No Twitch identity. WIRE still `enabled=false`.

Recovery mail was sent through the ordinary Sign in form. **Login is not confirmed until the owner finishes that mail and sets the password on My Account.** Do not put that password in this repo or in GitHub.

**This file is not A19-WIRE-GO.**

---

## Copy this later, after PlayTester can sign in

A19-WIRE-GO.

Use PlayTester only. Do not use Sora or Twinkle.

1. As `postgres` on `dtflmlbjhttoewqgkujf`: `SELECT private.streamlink_wire_set_enabled(true);` then catalog-check `enabled=true`.
2. Quiet window: one ordinary wild Bulbasaur (form `1`) community encounter. PlayTester joins, throws one Poké Ball, existing settle. No grants, hosted generate, hidden ticket, G1/C1, or TEST `testOutcome=catch` unless the first live throw escapes and a persist-only retry is needed.
3. Inspect only that PlayTester catch plus its settle/`capture_log`/item spend. Expect `SL` public id, pin `sl-ref-20261013-227b573`, nature 1–25, ability slot `1` (Overgrow), IVs 0–31, HP filled, friendship 50, one ball spent, replay exactly-once.
4. Immediately `SELECT private.streamlink_wire_set_enabled(false);` and catalog-check `enabled=false`.
5. Report REAL RPC / PRODUCTION results. Then STOP.
6. Optional, only if this same GO says so: release that one new `catch_id` on the existing player-release path. Not RESET-GO.

No merge, deploy, APP stamp, grants, staff changes, or database-wide delete.
