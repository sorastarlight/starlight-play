# Berry catch drops

Owner requested XP-scaled additional berry drops and one standard Poké Ball for valid failed throws, then authorized proceeding. This packet implements that behavior; it does not activate berry type affinities.

Successful berry catches roll once using pre-award XP: 90% at level 1, 75% at level 3, 60% at level 5, 45% at level 8, and 35% at level 10+, interpolated by the existing XP curve. Rarity selects the reviewed five-bucket weights. The frozen 60-item pool comes from the published purchasable-item snapshot, excluding storage upgrades, avatars, Master Balls, currencies and Pokémon. Each drop grants one item. Existing encounter loot stays additional.

Failed valid throws receive one standard Poké Ball, with no berry requirement. No-throw, cancelled, test and pre-activation capture records are excluded. Unique round/trainer receipts save failed rolls too. Full bags retain pending items; own-account claims cannot reroll or claim another trainer's receipt.

INSTALL creates three private RLS tables and five narrowly scoped functions, initially disabled. It adds one hook before XP in the existing reward function and one inventory row lock in the shared grant helper. Existing function permissions are preserved. New public endpoints authenticate the caller and only list/claim that caller's pending rewards. No player records are altered by installation.

ACTIVATE verifies all seven function bodies and the exact pool, then sets a one-time cutoff. STOP disables new recording but allows pending claims. ROLLBACK verifies the two replaced function bodies, disables recording and restores their exact definitions. It intentionally preserves earned receipts and claim endpoints; it never retracts rewards.

## Evidence

- LOCAL SQL: 26 check groups, including all 60 real item-grant paths, actual capture-log reward trigger, concurrent same-receipt claims, concurrent settlement, one-slot competing grants, no-roll retry, eligibility, full bags, auth isolation, transactional rollback, activation refusal and exact source restoration.
- Local schema-only PostgreSQL 17 rehearsal: 142 empty application tables; fictional users only. No production data import or gameplay invocation.
- Frontend: escaping, account-switch invalidation, duplicate clicks, full-bag response, confirmed delivery and uncertain-response handling.
- Regression: 163 test files pass; build validation passes; APP remains 20261008-rc133.
- Private execution evidence: C:/Users/FET/AppData/Local/PokemonStreamLink/security/berry-drops/.

Hosted verification must inspect source/policy only. No hosted catch, claim, notice acknowledgement or test grant is included. Physical backup coverage after installation remains a separate follow-up.
