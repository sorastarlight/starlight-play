# Native diagnostic migration: field and scope review

October28 source-only inspection refreshed five legacy report definitions and thirteen supporting definitions. No application report, self-test, account read, notice, provider action or mutation was invoked. Raw definitions/hashes remain private under security/hub-diagnostics-parity. This review is not a production data finding or approval to wire the old endpoints into the Hub.

## Recommended presentation

Add an explicitly loaded Checks workspace to Analytics, alongside the existing summary reports. Keep Content, Capture records and Event readiness as distinct checks. Show Population & supply statistics as neutral information, not a green pass/fail certificate. Each panel should say what it checked and its period. A returned warning is a completed check with findings, not a transport failure. Missing fields stay unavailable. No automatically run self-tests, repair buttons or repeated background requests. Each new privileged report flow remains held for reviewed publication authority.

## Exact retained scopes

| Report | Source field | Accurate staff meaning and required label |
| --- | --- | --- |
| Capture | recent.throws / expected / actual | All retained non-Master-Ball capture logs with a recorded Ball. Despite the name recent,this query has no date cutoff. Expected catches is the sum of recorded chances,not a guaranteed count or a statistical certification. |
| Capture | unknownBalls | All retained logs whose stored Ball condition is UNKNOWN;not the count of every invalid inventory item. |
| Capture | shinyFemaleUnflagged | All retained shiny-female logs missing the Shiny flag. No date filter. |
| Capture | missingLogs | Participants marked as having thrown,with a nonempty result,in rounds started within14days,but without a matching capture log. |
| Capture | selfTest / ultraMultiplier / clientBuild | Separate structural/configuration self-tests and currently configured Ultra Ball multiplier. Self-tests have a distinct call closure and must not be presented as real two-account throw evidence. |
| Content | missingIcons | Live products with neither a sprite nor thumbnail reference. Does not fetch files or verify HTTP availability. |
| Content | missingPortraits | Visible appearances missing a portrait reference. Existing status/ok aggregation omits this field;the new view must still show it as a finding. Do not inherit an overall Healthy badge blindly. |
| Content | brokenPacks | Products marked pack with empty/null grants,including unpublished rows. Other malformed reward structures are not checked here. |
| Content | dualCurrency / negativeInventory | Rows with both positive PokéCoin and Bits prices;inventories with negative coins or basic Poké Balls only. Does not validate every stack,Candy,PC storage or coin-ledger reconciliation. |
| Content | bitsInvalid / bitsCollisions | Live Bits product structure and duplicate Bits amounts under the current helper. This does not contact Twitch or certify provider mappings/payment delivery. |
| Economy | trainers / median fields | Current population excluding only the exact username playtester. Staff and other test accounts remain. Balls,Honey and Berry use legacy inventory columns;Berry means the basic Oran column,not all berry types. |
| Economy | medianBagBonus | Median purchased bag bonus,not total bag capacity or current free space. |
| Economy | throws7d / catches7d / captureRate7d | Last7days;excludes TEST rounds and cancelled rounds. Rate is already a percentage from0to100,unlike the fractional rate in the ordinary Captures report. |
| Economy | ballMix7d / berryMix7d | Top8 recorded types over7days;excludes TEST rounds but does not exclude cancelled rounds. Denominator differs from the headline throw count. Do not imply their counts reconcile. |
| Economy | coinGrants7d | Positive coin grants recorded in reward_events over7days,not all coins entering the economy. |
| Economy | status | Always HEALTHY in this source. It does not establish accounting health. Render statistics neutrally. |
| Events | liveCount / stuckCount | Event rows marked LIVE,NEEDS_ADMIN or WAITING_FOR_STREAM. More than one LIVE is action-needed;waiting states are warnings. Does not advance,schedule or settle events. |
| Events | nextScheduled / lastCompleted | Earliest scheduled start and latest completed update with retained event metadata. Render only needed fields;do not expose arbitrary internal notes by default. |
| Events | availability | Counts from configured spawn scope and species classification;not a full evolution/acquisition completeness test. |
| Loot | inventory | Bag-column totals across inventories,not PC storage/pending gifts. Stones covers five legacy stone keys only. Do not label this all item holdings. |
| Loot | config / bitsPacks | Current loot settings and Bits product rows;not proof that purchase/provider delivery works. Native configuration/Bits views already cover editing and product inspection. Avoid another redundant editor. |
| Loot | warnings | Two Ultra Ball heuristics. The average warning includes all inventories,despite its text saying active trainers. Not a fraud finding. Direct helper access is service-role only in the inspected ACL;do not broaden it. |

## Implementation boundaries

Prepare a bounded server projection before new hosted reads. Retain current staff checks and narrowly allowlist its output. Content warnings may return ok:false;Event health omits ok entirely. Neither payload fits the existing Analytics adapter's successful-report contract,so blindly reusing that adapter would turn real findings into load errors. Keep a separate typed diagnostic contract. Reinspect all source/authority contracts before any activation.

The incomplete helper chain for form display and the previously reviewed capture self-test closure must be reconciled before claiming a full call-tree audit. Current work establishes output semantics and important misleading-label risks;it does not establish every helper as side-effect-free. No production correction is proposed from source naming alone.

Next local slice:disconnected Checks layout and typed projection,error/empty/partial/escaping/account-transition tests. Hold production endpoint/publication and any corrective SQL for consolidated owner review. Destructive cleanup,cosmetic revocation,product-copy semantics and real device/provider acceptance retain their separate boundaries.
