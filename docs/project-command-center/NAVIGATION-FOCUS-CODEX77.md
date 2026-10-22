# CODEX-77 — Navigation Escape focus restoration

Hosted guide REAL DOM reproduced a small keyboard defect:open navigation,Tab to first link,Escape closes the panel and leaves document focus rather than restoring its button. The shared nav handler now captures whether focus belongs to an open navigation/account menu before closing it,and restores the corresponding opener with preventScroll. Unrelated controls retain their focus;menu opening,links,Auth,notices and gameplay are unchanged.

REAL DOM isolated local preview with actual nav.js/shared stylesheet verifies both navigation-link and account-link Escape paths return to their openers. Its links cannot navigate and no account/backend client is loaded. Six actual-source LOCAL HARNESS checks cover both menu types,unrelated/modal focus,already-closed menus,non-Escape keys and absent controls.85 non-writing suites/build31HTML464refs pass;APP20261008-rc133 unchanged. Screenshot:nav-focus-codex77.png.

Native browser zoom shortcuts on the hosted guide produced no measurable change:document1265px/root16px before/after. Inverse shortcuts were issued. This is NOT200% browser-zoom acceptance. Browser capabilities expose no zoom control;prior narrow frames remain only reflow evidence,not a physical-device or zoom certificate.

The nav correction is local/on feature branch only. Hosted publication requires the existing gate unless the owner approves the narrowly scoped policy proposed in FRONTEND-PUBLICATION-POLICY-PROPOSAL.md. No production runtime change,SQL,Auth setting,provider,DNS,email,gameplay,spending or APP stamp occurred in this task.
