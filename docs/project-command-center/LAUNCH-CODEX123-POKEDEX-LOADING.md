# CODEX-123 — Pokédex navigation failure recovery

The Pokédex awaited its session/profile navigation lookup outside the existing loading error boundary. A rejected fictional session read reproduced an escaping rejection. The correction moves that lookup and existing signed-out/loading branches inside the same try block. Existing generation checks, catalog calls, Familiarity handling, team behavior and permissions remain unchanged.

Five LOCAL cases execute the actual selected loadNav/load source with fictional dependencies: rejected session, rejected profile, signed-out gate, stale failure after a newer successful load, and recovery on a later load. The fixture extraction boundary typo was corrected before the meaningful baseline failure. All104 known non-writing suites pass; build31localHTML/464references and12recovery hashes pass. No actual session/profile/state/catalog endpoint was called.

Isolated REAL BROWSER component acceptance used those actual functions, play.css, fictional session/catalog helpers and connect-src none. Native buttons demonstrated the error gate then successful recovery. This is not full-page, physical-device, assistive or real-provider acceptance. Screenshot:C:/Users/FET/.codex/visualizations/2026/10/19/01a15207-ca1f-7800-95d6-9fb36dc377d5/pokedex-recovery-codex123.png. Temporary tab closed and loopback server stopped.

Publication pending exact runtime-only diff under CODEX-78. No SQL, Auth/provider authority, account/player mutation, gameplay, email, spending, scheduling, APP stamp or final launch. Sora NO;Twinkle NO;PlayTester role unchanged. Twitch testing remains held and required real acceptance remains open.
