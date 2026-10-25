# CODEX-224 — Bounded hosted Configuration read acceptance

**Prepared request only. No hosted navigation or application calls are authorized by this document.** CODEX-178's earlier owner inspection/notice exception is complete and spent. CODEX-219 authorized publication/source verification of Pass bundles,not live loading.

## Purpose

Close the remaining actual hosted-load gap for the published Pass bundle and capture-limit editors. This does not test saving or claiming rewards. The six PokéCoin settings load automatically when Configuration opens and are included in the same bounded read window.

## Exact proposed scope

1. Recheck the reviewed definitions,owners and EXECUTE permissions of the three read endpoints and relevant guard/read helper closure using catalog-only metadata. Recheck the deployed frontend against the reviewed publication. Stop on drift or a read path that writes;do not patch anything as part of acceptance.
2. Use the existing normally authenticated owner session. Verify the intended owner in the existing site UI before the new page load;otherwise stop for normal human sign-in. Never handle passwords,tokens or injected authentication state.
3. Load `https://play.sorastarlight.net/admin-next.html?section=config` once. The normal session/profile/staff access checks and automatic six-field `admin_economy_overview` read are included. Do not visit Operations,Support,Analytics,Trainers or Mart during this packet.
4. Press **Load Pass rewards** once (`admin_content_studio`). Inspect daily/weekly rows,sprites,names and quantities as returned. Optionally open the reward picker,type one search and dismiss it without selecting a reward. No quantity edits,removal,review/save or reload.
5. Press **Load chance limits** once (`admin_capture_overview`). Inspect both loaded probabilities and their percentage presentation without editing. No review/save or reload.
6. Record loaded/unavailable/error states and screenshot layout evidence. Keep raw returned application data and private account details out of public reports. Do not export catalog,trainer,profile or Auth data.

## The only proposed write exception

Shared navigation's first signed-in paint can call `play_notices`,marking that verified owner's pending notices seen. Authorize only that ordinary automatic acknowledgement during the single page load. No manual call,refresh/reopen to replay notices or repeat allowance. This is a protected-account write and is why this read-acceptance packet requires an important owner decision under `.cursor/rules/streamlink-project.mdc` rather than being described as side-effect-free.

## Exclusions and stop conditions

No SQL/function/permission change;settings save or draft creation;Pass override,re-grant,claim or refresh;item/Pokémon grant;provider/OAuth action;gameplay,shop,evolution,Oak or trade;role/credential/DNS/spending change;`admin_overview`,`play_sync`,`play_account_state`,heartbeat or encounter call;raw export,APP stamp or final launch.

Stop on unknown/wrong account,denial,unexpected application/provider command,malformed/unsupported return data,an error or any need to save/change data. Do not retry a failed read in this packet. Existing unsupported/unavailable states may be recorded honestly,but do not count as populated acceptance. Do not manufacture values or grant more data to make a test pass.

No mutation test,physical-device/screen-reader certification or wider provider acceptance follows. This is one new bounded page/read window only;all older spent approvals remain spent.
