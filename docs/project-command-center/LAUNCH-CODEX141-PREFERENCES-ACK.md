# CODEX-141 — Encounter preferences and reward acknowledgement

18 REAL LOCAL SQL cases execute captured play_set_encounter_settings,private.normalize_encounter_settings and play_ack_cosmetics definitions. Fictional profiles/reward tables,Auth identity and a scoped ball allowlist stand-in are used;not full cosmetic eligibility,gameplay automation,RLS or provider certification.

Selected acknowledgements update only own existing cosmetics/titles/badges;replay preserves seen timestamps;empty/unknown IDs do not create or alter rewards;null IDs acknowledge all own rows without granting rewards. Preferences use defaults,filter/deduplicate/bound favorite balls to6,retain valid prep and ignore privilege/economy/target-shaped fields. Malformed settings error before changing saved profile preferences. Missing identity refuses both endpoints.

No new defect confirmed or production change. Private source/harness/results:LOCALAPPDATA/PokemonStreamLink/security/codex141. Loopback55541 stopped and temporary fixture removed. No hosted acknowledgement/preference call,grant,provider,email,credential,SQL,player or APP action. Sora NO;Twinkle NO;PlayTester role unchanged. Recovery10deltas/20files;real acceptance required/Twitch held.
