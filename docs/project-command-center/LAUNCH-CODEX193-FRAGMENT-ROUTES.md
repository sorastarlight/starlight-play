# CODEX-193 — Local fragment route review

October24,2026. Reviewed seven local fragment-link references across the same29root documents used in CODEX-184/186, excluding protected admin.html and temporary tmp-* audit pages. One reference has a static HTML target; six are supported dynamic routes. No runtime fix was needed.

Five Settings references use connections,trainer-id or trainer-id/titles. The actual extracted LEGACY_HASH map recognizes each route. The remaining dynamic link,from Evolve to store.html#evolution,is recognized by the actual extracted Mart resolveTab/floorTabId functions with a fictional matching evolution floor. No current catalog was queried; actual hosted floor availability is not certified by the fixture. Duplicate references are counted separately.

Evidence:evidence/codex193-fragment-routes.json. Only static parsing and extracted pure route definitions ran locally. Neither Settings nor Mart startup was booted;no browser/account/provider navigation,application endpoint or write occurred. This complements CODEX-186's path-existence check;it does not certify all generated links,remote links,hosted Auth or user actions. No full regression rerun was needed for unchanged runtime source.
