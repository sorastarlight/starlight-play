# CODEX-163 — approved manual linking configuration correction

October23,2026: user reports newly registered ShinoTheWolf cannot reach Twitch authorization in Firefox and no connection is linked. Source inspection confirms js/auth.js uses Supabase auth.linkIdentity with skipBrowserRedirect, then window.location.assign: this is a same-tab redirect, not a popup. The dashboard showed Twitch enabled but Allow manual linking disabled. Supabase identity-linking documentation confirms that manual linking must be enabled for this API. This is a confirmed configuration blocker, not proof of every symptom or successful provider acceptance.

Owner explicitly approved enabling only Allow manual linking and verifying persistence. Toggled that one control, saved, reloaded dashboard, and observed it enabled. New signups stayed enabled; email confirmation stayed enabled; anonymous sign-in stayed disabled. No other Auth/provider control was edited. No SQL, policy activation, account linking/repair, credentials, reward claim, Pass check or gameplay was performed by the agent. Existing separate one-link policy was not changed. Approval spent.

Private before/after screenshots: LOCALAPPDATA/PokemonStreamLink/security/twitch-link-check/manual-linking-disabled.png and manual-linking-enabled.png. REAL DASHBOARD verification only; no runtime code changed, so no source-regression suite rerun.

Tester next step: reload Settings in their own Firefox session; Connect Twitch, Continue to Twitch, perform their own consent, then confirm the correct returned account with Yes, link this account. Ordinary subscriber/Pass success remains UNVERIFIED pending real tester results. Do not claim this setting correction closes provider acceptance.
