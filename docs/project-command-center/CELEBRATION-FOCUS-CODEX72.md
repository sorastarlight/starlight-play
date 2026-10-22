# CODEX-72 — Celebration keyboard containment

> Current hosted status:approved publication c7f5366a and scoped read-only acceptance complete in CODEX-75. Earlier local-only/publication-held statements below are historical.

The hosted isolated milestone preview reproduced Tab leaving the open celebration: after Continue, focus reached the background Preview level2 control. The custom aria-modal container described its intended behavior but did not prevent background focus.

The shared presentation engine now makes existing background siblings inert while a blocking panel is open, wraps Tab/Shift+Tab across its currently visible enabled controls and redirects stray background focus into the panel. It preserves preexisting inert state and removes listeners on dismissal. Reset settles the panel before restoring focus, so it also releases inert background controls. Queue ordering,animations,preview flags,reward/equip RPCs and progression authority are unchanged.

REAL DOM local preview:level Continue retains focus across forward/backward Tab;Escape restores Preview level2. Achievement reduced-motion preview retains focus;Continue restores Preview Pokemon Trader. Background controls disappear from the accessibility tree while open. Screenshot:celebration-focus-codex72.png in the task visualization folder. No account connection or hosted mutation.

LOCAL HARNESS:9 actual-source public-API scenarios cover single/multiple controls,hidden/disabled dynamic controls,stage fallback,stray focus,reset/listener removal and preexisting inert preservation.83 non-writing regression suites pass;build31HTML/464references,APP20261008-rc133 unchanged. Evidence:evidence/celebration-focus-codex72.json and evidence/codex72-regressions.json.

This is local acceptance,not hosted verification or complete accessibility certification. No production deploy/merge,SQL,gameplay,grant,provider/password change,spending or APP stamp. Sora NO;Twinkle NO;PlayTester role unchanged. A separate security packet awaits an owner permission decision and remains local until remediation.
