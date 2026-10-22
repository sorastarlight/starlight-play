# CODEX-114 Live reduced-motion response and deployment recovery

## Concrete accessibility fix

play-perf previously applied motion attributes only at initial load/manual performance changes. Changing the OS preference later left data-reduced-motion and AUTO mode/body classes stale;CSS effects that depend on those attributes could continue. The baseline live-change assertion failed. A guarded MediaQueryList change listener now reapplies the existing preference,with addListener compatibility and failure tolerance. Manual HIGH remains HIGH while the independent reduced-motion flag suppresses effects. No settings policy,network or gameplay change.

Validation:13LOCAL performance assertions (sixnew),all100known non-writing STATIC/LOCAL suites,and build31HTML/464references pass. Isolated REAL BROWSER uses actual Pokédex HTML/CSS/performance script with mocked matchMedia and private mock localStorage;no SDK/RPC. AUTO high/animation dex-hero-float/sparks block became low/none/none on reduced motion;manual HIGH with reduced1kept animation none;clearing preference restored high/dex-hero-float/block. This does not replace physical OS/device/assistive acceptance. Private loopback server stopped.

Feature03ed369f;only js/play-perf.js to mainbb18025a under CODEX-78. Initial branch switch was blocked by a generated tracked report;the attempted push was rejected non-fast-forward with no main change. Committed the report,then switched/reviewed/pushed the exact5-line runtime diff successfully. No forced push or history rewrite.

## Prior publication now closed

Run39796866472completed/success. Expanded checker verified both Events and Trainer sources now match their candidates;only the then-unpublished motion script differed. Earlier cancelled Events run needs no rerun because the successful main commit includes it. CODEX-112/113 hosted acceptance is now complete. Keep the prior verification-tool omission correction as historical evidence.

APP20261008-rc133 unchanged. Sora NO;Twinkle NO;PlayTester role unchanged. No SQL,provider,Auth,grant,email,gameplay,spending,scheduling or final-launch action. Real acceptance remains required;Twitch remains held.

Follow-through:14focused assertions now pass,including blocked localStorage. A new baseline caught the media listener rereading AUTO after a failed preference save. It now reapplies the current DOM-selected preference so manual HIGH survives for this page. All100suites/build repassed for this changed edge case. First motion candidate hosted bytes matched100/100while run39799034917stillreportedqueued;the storage-fallback follow-up is separately published/verified below.

Final storage fallback:feature8c3c1546;main739fbc19;Pages39799569389. Actual hosted Events/Trainer match;motion source currently matches first revisionbb18025a while followup awaits. No success claimed for followup yet.

Last check:39799569389stillqueued;build completed,deploy waiting. Actual page script URL with existingAPPquery returns200and first motion revision,not final storage fallback. No manual workflow retry/cancel;local watcher stopped. Keep CODEX-114pending final hosted equality.

VERIFIED CODEX-115:39799569389completed/success;expanded100/100hosted files match checkout,including final motion fallback739fbc19. All previous queued/first-revision-only states above are historical. Physical OS/device acceptance remains separate.
