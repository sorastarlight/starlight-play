# Remaining diagnostic parity — October 27

This is a source review, not the result of running production health checks. No condition below is a confirmed production data defect. The current native reports are useful summaries but should not be used to sign off the checks they do not contain.

| Legacy diagnostic | What it actually measures | Native coverage and remaining work |
| --- | --- | --- |
| Capture health | Capture probability self-test results, expected versus actual catches, unknown ball conditions, Shiny-female flags, missing throw logs | Capture reports summarize rates by species/ball/berry/tier. They do not replace self-tests or log-integrity checks. Inspect the self-test helper's full call tree before approving a native diagnostic action; its name alone does not prove no writes. |
| Content health | Missing item images and portraits, broken packs, mixed payment currency, negative inventory, invalid/colliding Bits products | Native catalog editors and Bits activity expose some of these subjects. Neither editing nor a product count proves that the cross-catalog checks passed. Prepare a field-preserving bounded diagnostic, not automatic calls on every tab. |
| Economy health | Population medians for currencies, balls, Honey, berries, Candy and bag capacity; seven-day throws/catches/grants and item mix | The native Economy report covers balances and retained ledger totals, and existing game health checks negative quantities. Seven-day population/item distributions remain distinct; no report shown here proves ledger accounting consistency or permits repair. |
| Special Event health | Live/stuck counts and next/last event timing/availability | Native event lists/history and controls are not a replacement for structural consistency checks. Avoid automatically scheduling or settling an event while inspecting it. |
| Loot overview | Loot configuration/reporting semantics retained in the old tool | Supply editors and reward pools overlap, but exact eligibility, scopes and output fields still need comparison. Do not restore old self-grant testing as a generic staff diagnostic. |

The routine Health summary correction displays four statuses already present in its existing response: Database, Encounter records, Economy balances and Rankings. It adds no RPC or automatic test execution. Auth dashboard settings, real asset availability, physical restore contents and real screen-reader/provider acceptance cannot be certified from these database summaries.

The migration remains incomplete until each retained diagnostic has a documented native equivalent or an explicit retirement decision. This review does not authorize old entry redirects, destructive catalog cleanup, new server endpoints or hosted diagnostic execution. Private source contracts stay outside Git.
