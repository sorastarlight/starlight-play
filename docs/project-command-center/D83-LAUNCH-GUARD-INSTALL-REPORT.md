# D83 — Launch-guard installation

**Verdict:** **D83 LAUNCH-GUARD INSTALLED**  
**Status:** `private.round_is_active(encounter_rounds)` was replaced on `dtflmlbjhttoewqgkujf`. No round was opened.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `a8320107`  
**Work commit:** pending pointer  
**Production APP:** `20261008-rc133` (unchanged).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

The owner authorized this one unchanged file. The historical “Do not start D83” line in the D82 report stays there. Do not start D84.

## File

`supabase/unapplied/d81-encounter/001_round_is_active.sql`  
SHA-256 `d1a408c5687f817a056a103eba1767ff971e4538355d43958e48e5c1936ffc8d`  
The file bytes were executed, including its `BEGIN` and `COMMIT`. It was not wrapped in a second transaction and was not recorded as a migration. Latest `schema_migrations` row remains `20261016042345` `d55_economy_001_spend_rules`. The rollback file was not executed. The SQL files were not edited.

## Before

Catalog `2026-10-18 05:58:06.640731+00`.

| Attribute | Value |
|---|---|
| Arguments | `r encounter_rounds` |
| Result | `boolean` |
| Owner | `postgres` |
| Language | `sql` |
| Security | invoker |
| Volatility | stable (`s`) |
| Parallel | unsafe (`u`) |
| `proconfig` | null |
| `proacl` | null |
| prosrc md5 | `5732cc462502e346843eedb76fada494` |

`anon`, `authenticated`, `public`, and `service_role` could EXECUTE. Lifecycle `inactive`, `activated_at` null, WIRE `enabled` false, `settle_if_needed` md5 `565c102d0a8c84a3dfd036653aca307c` at `2026-10-18 05:58:06.940968+00`.

## After

Catalog `2026-10-18 05:58:36.032014+00`. One function. prosrc md5 `53d7e8a3f3894212e854618dc0663101`. Body is `r.id is not null and not r.cancelled and private.round_phase(r) <> 'closed'`.

Owner, signature, result, language, security invoker, stable, parallel unsafe, null `proconfig`, and null `proacl` are unchanged. The same four roles can EXECUTE. Lifecycle is still `inactive`, `activated_at` is still null, WIRE is still false, and `settle_if_needed` md5 is still `565c102d0a8c84a3dfd036653aca307c` at `2026-10-18 05:58:35.981445+00`.

No launch, pause, cancel, gift, catch, or gameplay RPC was called. This catalog check did not exercise an encounter.

## Next

No further task is authorized. An encounter or stamp smoke needs its own GO.

Do not start D84.
