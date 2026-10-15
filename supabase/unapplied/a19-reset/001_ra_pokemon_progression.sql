-- A19-RESET R-A UNAPPLIED SCRIPT (issue #25 / D43)
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Execution requires a later named A19-RESET-GO and the session GUC below.
--
-- Scope: disposable (non-protected) caught Pokémon, party/PC pointers,
--        trades on those catches, oak transfers on those catches,
--        catch-derived evo log, encounter participation, active rounds.
-- Preserve: auth, profiles rows, Twitch, Sora, Twinkle and their data,
--           economy/inventory/PokéCoins, species_seen/form_seen,
--           site_config, staff_roles, private.ref_*.
--
-- Fail closed unless the operator opts in this session:
--   SET starlight.reset_confirm = 'A19-RESET-GO';

BEGIN;

DO $guard$
BEGIN
  IF current_setting('starlight.reset_confirm', true) IS DISTINCT FROM 'A19-RESET-GO' THEN
    RAISE EXCEPTION 'A19-RESET refused: UNAPPLIED script. Set starlight.reset_confirm=A19-RESET-GO only after a named A19-RESET-GO.';
  END IF;
END
$guard$;

CREATE TEMP TABLE reset_protected_users ON COMMIT DROP AS
SELECT p.id
FROM public.profiles p
WHERE lower(coalesce(p.twitch_login, '')) IN ('sorastarlight', 'twinklephoenixstar')
   OR lower(coalesce(p.username, '')) IN ('sorastarlight', 'twinklephoenixstar');

CREATE TEMP TABLE reset_catch_ids ON COMMIT DROP AS
SELECT c.id
FROM public.catches c
WHERE NOT EXISTS (
  SELECT 1 FROM reset_protected_users u WHERE u.id = c.user_id
);

-- Party / PC pointers (non-protected profiles).
UPDATE public.profiles pr
SET team_ids = ARRAY[]::uuid[],
    pc_layout = '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = pr.id);

-- Protected profiles: drop only leaked reset catch ids; keep their boxes.
UPDATE public.profiles pr
SET team_ids = COALESCE((
      SELECT array_agg(x)
      FROM unnest(COALESCE(pr.team_ids, ARRAY[]::uuid[])) AS x
      WHERE x NOT IN (SELECT id FROM reset_catch_ids)
    ), ARRAY[]::uuid[])
WHERE EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = pr.id)
  AND pr.team_ids IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(pr.team_ids) x WHERE x IN (SELECT id FROM reset_catch_ids)
  );

-- Soft ref: drop showcase.shinyCatchId when it points at a reset catch.
-- achievementId is not a catch pointer and is left alone.
UPDATE public.profiles pr
SET showcase = pr.showcase - 'shinyCatchId'
WHERE jsonb_typeof(pr.showcase) = 'object'
  AND pr.showcase ? 'shinyCatchId'
  AND EXISTS (
    SELECT 1
    FROM reset_catch_ids r
    WHERE r.id::text = pr.showcase->>'shinyCatchId'
  );

-- Trades that reference reset catches.
DELETE FROM public.trade_offers o
WHERE o.catch_id IN (SELECT id FROM reset_catch_ids);

DELETE FROM public.trade_listings l
WHERE l.catch_id IN (SELECT id FROM reset_catch_ids);

DELETE FROM public.direct_trades d
WHERE d.a_catch IN (SELECT id FROM reset_catch_ids)
   OR d.b_catch IN (SELECT id FROM reset_catch_ids);

-- Hard FK: oak_transfers.catch_id → catches(id) has no ON DELETE.
DELETE FROM public.oak_transfers o
WHERE o.catch_id IN (SELECT id FROM reset_catch_ids);

-- Catch-derived evo history for non-protected users (not species_seen).
DELETE FROM public.evolution_log e
WHERE NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = e.user_id);

-- Encounter participation (keep protected users' rows).
DELETE FROM public.encounter_players e
WHERE NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = e.user_id);

DELETE FROM public.encounter_activity e
WHERE e.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = e.user_id);

DELETE FROM public.capture_log e
WHERE e.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = e.user_id);

DELETE FROM public.play_console_log e
WHERE e.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = e.user_id);

-- Active encounter state only. Do not delete historical rounds
-- (public.catches.round_id references encounter_rounds.id).
UPDATE public.encounter_rounds
SET cancelled = true,
    resolved = true,
    updated_at = now()
WHERE resolved IS NOT TRUE
  AND cancelled IS NOT TRUE;

-- Economy: keep candy_ledger rows; drop dangling catch pointers.
UPDATE public.candy_ledger
SET related_catch = NULL
WHERE related_catch IN (SELECT id FROM reset_catch_ids);

-- Optional derived catch counters. Candy totals stay.
UPDATE public.trainer_stats ts
SET captures = 0,
    catch_streak = 0,
    best_catch_streak = 0,
    fails = 0,
    fail_streak = 0,
    best_fail_streak = 0,
    released = 0,
    traded_away = 0,
    traded_in = 0,
    trades_done = 0,
    evolved = 0,
    encounters = 0,
    optimal_catches = 0,
    first_pokemon_dex = NULL,
    first_shiny_dex = NULL,
    updated_at = now()
WHERE NOT EXISTS (SELECT 1 FROM reset_protected_users u WHERE u.id = ts.user_id);

DELETE FROM private.streamlink_hidden_tickets;

DELETE FROM public.catches c
WHERE c.id IN (SELECT id FROM reset_catch_ids);

COMMIT;
