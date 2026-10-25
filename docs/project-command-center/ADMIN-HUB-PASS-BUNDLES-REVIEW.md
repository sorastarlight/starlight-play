# CODEX-218 — proposed Starlight Pass bundle editor

Design/source preparation only,October25. Disconnected [visual review](design-reset/hub-pass-bundles-review.html);no SDK,Auth,backend,persistence or site configuration change. The existing Studio's local draft defect was separately corrected by CODEX-217;that maintenance does not implement this new Hub workspace.

## Proposed first scope

Move editing of daily/weekly reward contents into the new Admin Hub. Two independent lists show friendly names,canonical sprites and whole quantities. Add through normalized name search;remove only from the selected bundle. Review before/after contents and site-wide impact before any proposed save. Discard/reload/navigation must protect unsaved local work in the actual implementation.

Initially support the eight existing core reward keys:Berry,Honey,Poké Ball,Great Ball,Ultra Ball,Poké Radar,PokéCoins and Inventory Space. Quantities1..2147483647;use Remove rather than silently interpreting zero. Each bundle must contain at least one supported positive reward in this first slice. Existing empty,malformed or unknown-key bundles remain unavailable/read-only with a current-tool handoff;never replace them with client defaults or silently drop contents. Dynamic/evolution/custom items and new gameplay effects remain later catalog work. This is a bounded next slice toward the owner's broader [future content requirements](FUTURE-CONTENT-MANAGEMENT.md),not completion of all item kinds.

## Existing contracts and limits

Catalog-only SELECT inspected installed `admin_content_studio()` and `admin_save_pass_rewards(jsonb,jsonb)`,plus selected `pass_reward_grants`, `game_settings` and `store_item_is_live` helpers. Raw definitions remain private;fingerprints/ACLs are in evidence/codex218-contracts.json. No application function or live setting value was read. These selected source checks are not a complete security certification.

The existing Studio read and save both require the existing owner/admin edit guard. Read the successful `passRewards.daily/weekly` projection,discard unrelated catalog/report data,and use a dedicated two-command adapter after the current staff gate. Verify the same session identity before and after transport and clear all model/dialog state on sign-out,denial or account changes. Do not expand the generic RPC gateway. Further dependency inspection and source/ACL drift checks precede integration.

The save validates grants and replaces the `game_settings.starlightPass` object with `{daily,weekly}`,while merging other root game settings. It has no revision token or concurrent-edit lock. The proposed UI must not promise preservation of undocumented subfields inside that replaced object. If integration needs such fields or stronger concurrency semantics,prepare a separate server proposal rather than inventing preservation in the browser. No SQL change is included in this proposal.

The read helper returns configured bundles or existing server defaults when configuration is absent;those are the existing server contract,not client defaults to substitute on an error. The actual model must reject unavailable,partial,ambiguous or unsupported successful data. Validate both complete bags before review;send exactly `p_daily` and `p_weekly` once. Disable another attempt until reload after success or an uncertain receipt;do not automatically retry. Do not add automatic claim/re-grant calls. Future verification of a save needs an exact receipt check and fresh explicit load,not assumed success after a toast.

No eligibility,staff override,claim interval,inventory capacity,already-delivered reward or player claim-clock policy change is proposed. Configuring different rewards is a future owner action;no real amounts are changed by design/local implementation approval. The existing server contract does not guarantee that a claim already in flight freezes the previous bundle.

## Disconnected evidence

Eight measured editor/review states320/390/768/1024 fit horizontally and show valid visible art. Narrow quantities span the row so maximum-length values are readable. Native local interactions cover no-change feedback,daily-only review,weekly removal isolation,invalid quantity focus,normalized item search,no matches,cancel/Escape focus,in-memory demo apply and unavailable-state disabling. The mock is not the integrated model/adapter,actual item picker or a hosted save. Its reset/apply affect only fictional in-memory data;actual implementation needs discard confirmations and session/uncertainty handling. [Evidence](evidence/codex218-browser-review.json).

## Important decision

Approve this design and **local implementation/tests only**,using the existing read/save contracts and eight supported keys. Test unavailable/unsupported data,strict payloads,server denial,session changes before/after transport,stale responses,single flight,no retry,receipt mismatch/loss,draft reset/discard,keyboard dialogs and responsive layouts. Preserve current Hub configuration tools and separate ordinary trainer Pass claims from staff bundle configuration.

Production publication,live configuration reads/saves,SQL,claims/re-grants,provider work,APP stamp and final launch stay excluded. `.cursor/rules/streamlink-project.mdc` and CODEX-RUNNER.md require the design decision for a new privileged workflow outside CODEX-78 routine maintenance. This optional migration is not automatically a launch blocker.
