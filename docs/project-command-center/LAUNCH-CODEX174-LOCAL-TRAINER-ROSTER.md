# CODEX-174: local Trainer Pokémon roster complete

Owner approved CODEX-173 design and local implementation only. Production installation/publication and live roster reads remain held.

The Pokémon pane now has server-side search across all current Kanto holdings,40-record cursor pages,Previous/Next/Reload,GenerationI selection and the existing identity/stat formatter. Search accepts name/nickname words and padded/hash-prefixed exact dex numbers,including Unicode nicknames. No global total or live snapshot guarantee is claimed;ownership changes require refresh. No box editing,exports,grants,releases,trades,locks/favorites edits or new gameplay behavior.

New endpoint: public.admin_trainer_pokemon(uuid,text,integer,jsonb). It preserves existing staff visibility through require_hub plus an explicit true staff result/auth.uid check. SECURITY DEFINER/STABLE with pg_catalog search_path and qualified application objects. PUBLIC/anon execution revoked;authenticated/service_role execution granted subject to the staff guard. It returns only existing Pokémon identity/stat fields and paging metadata. Existing account/stat functions,tables,roles and records are unchanged.

Catalog confirmed non-null caught_at/id and current user index. Cursor uses descending(caught_at,id),preserving server microseconds as strings. Search length100,41-row lookahead,40 returned rows. No timestamp-only ordering,client-only search or copied limited snapshot fallback. Missing backend shows unavailable;missing new module retains existing honestly labeled40-row view. Future generations need supported server/reference changes;none invented. Large hosted roster latency remains unmeasured.

Client adapter accepts only this literal read,checks staff session and target before/after,projects allowed fields and discards stale replies on reset. Load/error clears cached rows/cursors;pending controls are disabled. Existing stat inspector preserves missing values/zeroes. One module/target lifecycle and no generic read allowlist expansion.

Validation:118/118 regression suites;build31HTML/471refs.29REAL LOCAL SQL cases on125fictional holdings using exact installed guard/stat formatter definitions:four pages,timestamp ties,Unicode/nickname/dex search,target isolation,cursor-owner changes,ordinary/anonymous/null-staff denials,malformed inputs,no record writes,guarded install/rollback/drift refusal. Real rendered module:85fictional rows,paging/search/details,Escape/error/pending/reset and4CSS widths;smallest roster controls44px,no measured document overflow. These are not physical device or actual staff acceptance.

Recovery:empty PG17 fixture from retained schema archive successfully applies11installed deltas plus this proposed endpoint,then reverses all12. Original585function/143relation-permission/56policy metadata restored exactly;142tables empty. No player/Auth data import,new export,production recovery connection or original archive mutation. Runtime stopped. This proposal is not a twelfth installed production migration.

Exact runtime publication scope:admin-next.html,js/admin-next.js,js/admin-next-record.js,js/admin-next-roster.js,css/admin-record.css. Packet:INSTALL.sql adds only new endpoint;ROLLBACK.sql removes only that endpoint after exact source/attribute/ACL checks. Dependency fingerprints/absence checked before install. SQL bytes pinnedLF. No hosted application navigation,live roster,save,grant,Auth/provider,APP stamp or final launch is included.

Packet SHA256:
INSTALL.sql e35d96e3c0e3926445175fe24b45cbbd2600b8b6fa51b15eb2c74d30e34b02df
ROLLBACK.sql 9b149ead6bb01b442e3d9a686e870b6be029ae54f5ff2a170abaa3e63361e091

Private local SQL/DOM harness and screenshot:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex174/. Durable safe evidence:evidence/codex174-{regressions,sql,real-dom,schema-replay}.json.
