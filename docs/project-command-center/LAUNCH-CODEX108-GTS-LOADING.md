# CODEX-108 GTS refresh ordering

Overlapping Realtime/poll/manual refreshes could let an older board response overwrite a newer snapshot, resurrecting removed listings visually. The baseline test reproduced the failure. Each board request now has a sequence number; only the newest request may replace listings or change its error text. Existing filtering, RPC arguments, subscription/poll frequency and server trade validation are unchanged.

Six LOCAL actual-source cases cover stale success, stale error, current failure preserving the displayed board, retry, removal to an empty board and unchanged read arguments. All 97 known non-writing STATIC/LOCAL suites pass; build validates 31 HTML pages and 464 references. An isolated browser using actual HTML/CSS/JS and fictional read replies retained Snapshot 3 after Snapshot 2 completed late. Images were blocked in this fixture; it is not visual asset/provider/device acceptance. Temporary loopback server stopped.

Only js/trade.js published under CODEX-78: feature8a8f9029;main5c6873f4;Pages39780889663. See evidence/codex108-regressions.json and evidence/codex108-gts-loading.json; hosted publication result is recorded separately. No production RPC, SQL, trade, account, provider, email, purchase, schedule or APP change. Sora NO;Twinkle NO;PlayTester role unchanged. Real acceptance requirements remain open.

Hosted verification: Pages39780889663 succeeded;56/56 public sources match. A check while deployment was pending still saw the previous trade.js (55/56); the post-deployment check passed.
