# CODEX-168: Pokémon gift quantity

Local implementation complete; production install/publication held for exact owner decision.

The owner requested an up/down quantity control for trainer Pokémon gifts. Proposed scope: 1–100 per gift, default one. One selected species, level and Shiny setting apply to the batch. Each specimen uses the unchanged canonical generation helper and its own source key.

Quantity one preserves the original action and payload. Larger gifts use a distinct pokemon_batch action so a rolled-back server refuses batches rather than silently granting one. The server read advertises pokemonGiftMaxQty; absent capability keeps the UI at one. One request UUID, staff reason and aggregate receipt cover the entire batch. The existing target profile lock, permission checks and protected-trainer denial remain. Inner transaction rollback prevents partial gifts; retry returns the receipt without granting twice. No new tables, permissions, RPC names or generator edits.

Validation: 117/117 non-writing suites; build 31 HTML/470 references. 23 local PostgreSQL checks use exact installed public function sources with fictional generation/helper fixtures; they do not prove actual canonical generation or hosted batch performance. Covered maximum/invalid quantities, late failure atomicity, simultaneous duplicate requests, audit outcome, original single gift, protected target and ordinary-user denials, exact rollback fingerprints and stale rollback refusal. Real rendered local UI: native Up increments 1→2, Down decrements, confirmation shows 2×Metapod, one simulated batch write includes qty2. No live grant or production action.

Private exact install/rollback and rehearsal: C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex168/. Review screenshot quantity-review.png.

Packet SHA-256:

INSTALL.sql: 0fc7922ed1e2a169dad484244a7cfd97cf6f5562259ad5ea7fd843e417799440
ROLLBACK.sql: c1250aa679209775149c6e8ef73ba383b83870a7250d8a06f9ee8104ba83dece

Publication scope: js/admin-next-rewards.js only. Database scope: public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text) and public.admin_trainer_rewards(uuid) only. Recheck exact public source hashes and unchanged canonical helper/permission controls before install; preserve ACLs/security attributes and verify source afterward without invoking rewards. No live gift test is included.
