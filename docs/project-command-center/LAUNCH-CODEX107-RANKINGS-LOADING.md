# CODEX-107 — Rankings request ordering and pagination retry

Confirmed functional frontend defect:with two delayed board requests,the older Level result could overwrite a newer selected Shiny board. The first new actual-source regression fails on baseline. Search submissions likewise lacked supersession checks,and a failed Load more left its button disabled.

Added independent board/search request generations. A board request captures its requested board;only the current generation may populate cache/render,advance pagination,show errors or clear busy state. A new full load hides obsolete pagination until ready. Current pagination failures re-enable the button while preserving rows. Search completion/error is ignored after a newer submission,including a short query that clears results. Existing page size,cache lifetime,search bounds,RPC signatures and server authority unchanged.

Nine LOCAL actual full Rankings source cases use modeled DOM and delayed fictional RPCs:old-board success/error,stale pagination,new-page failure/retry eligibility,normal append,cache reuse,old search success,error and cleared short-query handling. All96known non-writing STATIC/LOCAL suites pass;build31HTML/464refs with APP20261008-rc133 unchanged. No cumulative synthetic count presented as live QA.

An isolated real browser renders current Rankings markup/CSS/source with fictional delayed responses and no SDK/network client. After resolving Shinies then the old Level request,the selected board/current row survive and busy clears. After failing Load more,the current row remains and button is enabled. Fixture assets/nav/Auth are simplified;not physical-device/provider/full signed-in page certification. Temporary server stopped. Screenshot:evidence/codex107-rankings-loading.json.

CODEX-78 routine publication:feature6eef9023;main6146039d from a51bcbbf via scoped branch with ONLY js/rankings.js;Pages39775548558success. Returned to canonical admin-hub-overhaul;intentional separate histories retained. All56hosted source projections match. New tests/evidence remain on feature;no unrelated queued work published. No live Rankings bootstrap/play_state/RPC/user data requested.

Evidence:evidence/codex107-regressions.json,evidence/codex107-rankings-loading.json,public-launch-publication.json. No SQL,permission,account,provider,real email,gameplay,grant,spending,scheduling or APP change. Sora NO;Twinkle NO;PlayTester unchanged. Real mobile/assistive/provider acceptance remains required;Twitch tester unavailable. This fix does not defer or satisfy those gates.
