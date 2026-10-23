# CODEX-175: Analytics keyboard focus and international Mart search

Routine frontend maintenance under CODEX-78. Analytics report tabs now keep one roving tab stop on the last keyboard-focused tab, including when a delayed report completes. Manual activation remains unchanged. Mart search preserves Unicode letters and numbers instead of treating Japanese queries as an empty filter.

Validation:118/118 existing regression suites,including matching/nonmatching Japanese search cases;build31HTML/471refs;git diff check. Actual local full-shell fixture reproduced the original Shift+Tab detour and verified corrected exit/re-entry. A fixture-controlled delayed Captures response completed while Progression was focused;Shift+Tab left the list and Tab returned to Progression. Actual Mart module returned only the fictional Tokyo product for 東京 and zero products for 不存在. No production app endpoints,report calls,saves,SQL,Auth/provider actions,grants or APP stamp. Local screenshot is private at security/codex175/analytics-focus.png.

Publication pending;only js/admin-next-analytics.js and js/admin-next-mart.js are in scope. Hosted source evidence will be appended after deployment. This does not certify authenticated hosted behavior or physical assistive technology.

Publication VERIFIED: main d7082278 / GitHub Pages40021246367 success;100 monitored public sources and both actual versioned module URLs match exact published Git bytes. APP remains20261008-rc133. No authenticated page navigation/application endpoint or save performed.
