# CODEX-181: report status and heading consistency

The Health Application card was always assigned the amber unknown class,even for HEALTHY/OK. It now uses the existing active style for those two success values;other/missing statuses retain unknown styling. A null/non-boolean stream live value is now UNKNOWN rather than being presented as OFFLINE. Existing report text,requests,permissions and server authority are unchanged. Berry/catch-rate tier headings have consistent initial capitalization.

Actual loader cases verify known/unknown application status and null stream status alongside existing retry/partial/stale/single-flight cases. Actual local full shell renders Application active/green and boolean false stream inactive/neutral;Capture captions/headers checked with fictional data,network blocked.118regression suites/build31/471 pass. No additional hosted report,owner notice,save,grant,SQL or provider call. Scope only js/admin-next.js and js/admin-next-analytics.js under CODEX-78;publication pending. Private screenshot:security/codex181/health-colors.png. Not a new provider/physical-device/full health certification.


CODEX-181 VERIFIED:healthy/OK Application uses active styling;missing/non-boolean stream status stays UNKNOWN;Berry/tier headings aligned.118suites/build31/471;actual local health classes/headings. Exact2runtime main84a56029/Pages40064027714success;100monitored+2versioned sources match. No hosted report/notice/SQL/provider or save/grant action. Evidence:evidence/codex181-publication.json.
