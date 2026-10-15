-- A19-WIRE UNAPPLIED settle integration (epic #18, D47)
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Replaces only the successful-catch INSERT inside private.settle_if_needed
-- with private.materialize_streamlink_catch. Odds, announce_throws spends,
-- capture_log, console copy, and result labels stay as the live form-aware
-- body (LIVE CATALOG D47 / 20260918050200_form_aware_rpcs.sql).
-- Does not replace private.stamp_catch_row.
-- Does not flip private.streamlink_wire_switch.
-- Does not call local-only test injection functions.

BEGIN;

CREATE OR REPLACE FUNCTION private.settle_if_needed(r encounter_rounds)
RETURNS encounter_rounds
LANGUAGE plpgsql
AS $function$
DECLARE
  rec public.encounter_players%ROWTYPE;
  cfg jsonb;
  calc jsonb;
  bait_count int;
  player_count int;
  owns boolean;
  v_odds numeric;
  v_roll numeric;
  v_caught boolean;
  pending boolean;
  clk timestamptz;
  join_at timestamptz;
  prepare_at timestamptz;
  throw_at timestamptz;
  reveal_at timestamptz;
  throw_line text;
  who text;
  species text;
  test_out text;
  form_id int;
  v_level int;
  v_mat jsonb;
BEGIN
  IF r IS NULL OR r.cancelled THEN RETURN r; END IF;
  IF r.paused_at IS NOT NULL THEN RETURN r; END IF;
  IF NOT pg_try_advisory_xact_lock(hashtextextended(r.id::text, 0)) THEN RETURN r; END IF;
  SELECT * INTO r FROM public.encounter_rounds WHERE id = r.id;
  IF r IS NULL OR r.cancelled OR r.paused_at IS NOT NULL THEN RETURN r; END IF;
  SELECT EXISTS (SELECT 1 FROM public.encounter_players ep WHERE ep.round_id = r.id AND ep.result IS NULL) INTO pending;
  IF pending = false AND r.resolved THEN RETURN r; END IF;
  clk := now();
  form_id := private.canonical_form_id(r.dex, coalesce(r.pokemon_form_id, r.dex));
  species := coalesce(nullif(btrim(r.name), ''), private.form_display_name(r.dex, form_id), 'the Pokémon');
  IF r.deadlines IS NOT NULL THEN
    join_at := (r.deadlines->>'join')::timestamptz;
    prepare_at := (r.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    reveal_at := (r.deadlines->>'reveal')::timestamptz;
  END IF;
  IF join_at IS NOT NULL AND clk >= join_at THEN
    IF NOT EXISTS (SELECT 1 FROM public.encounter_players WHERE round_id = r.id) THEN
      INSERT INTO public.play_console_log (round_id, kind, message)
      SELECT r.id, 'cancelled', 'No Trainers joined the encounter. The wild ' || species || ' wandered away!'
      WHERE NOT EXISTS (SELECT 1 FROM public.play_console_log l WHERE l.round_id = r.id AND l.kind = 'cancelled')
      ON CONFLICT DO NOTHING;
      UPDATE public.encounter_rounds SET cancelled = true, hidden = true, phase = 'closed', resolved = true, paused_at = null,
        last_action = 'No Trainers joined. The wild ' || species || ' wandered away!', updated_at = now() WHERE id = r.id RETURNING * INTO r;
      RETURN r;
    END IF;
    PERFORM private.phase_banner(r.id, 'prepare', 'Trainers are preparing their items…');
  END IF;
  IF prepare_at IS NOT NULL AND clk >= prepare_at THEN
    PERFORM private.phase_banner(r.id, 'throw', 'Trainers are choosing their Poké Balls!');
  END IF;
  IF r.deadlines IS NOT NULL THEN
    IF throw_at IS NOT NULL AND clk < throw_at THEN RETURN r; END IF;
  ELSIF private.round_phase(r) IN ('join', 'prepare', 'throw') THEN
    RETURN r;
  END IF;
  throw_line := private.announce_throws(r.id);
  IF throw_line IS NOT NULL THEN
    UPDATE public.encounter_rounds SET last_action = throw_line, updated_at = now() WHERE id = r.id RETURNING * INTO r;
  END IF;
  IF reveal_at IS NOT NULL AND clk < reveal_at THEN RETURN r; END IF;
  IF r.deadlines IS NULL AND private.round_phase(r) = 'reveal' THEN RETURN r; END IF;
  cfg := private.capture_config();
  test_out := CASE
    WHEN coalesce(r.trigger_source, '') = 'TEST' THEN nullif(btrim(coalesce(r.rules->>'testOutcome', '')), '')
    ELSE NULL
  END;
  SELECT count(*)::int, count(*) FILTER (WHERE prep = 'bait')::int INTO player_count, bait_count FROM public.encounter_players WHERE round_id = r.id;
  FOR rec IN SELECT * FROM public.encounter_players WHERE round_id = r.id AND result IS NULL FOR UPDATE LOOP
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    IF rec.ball IS NULL OR rec.result_reason = 'no_ball_left' THEN
      UPDATE public.encounter_players ep SET result = 'No throw', caught = false, result_reason = coalesce(ep.result_reason, 'no_ball')
      WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
      CONTINUE;
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.catches c WHERE c.user_id = rec.user_id AND c.dex = r.dex) INTO owns;
    cfg := private.capture_config() || jsonb_build_object(
      '_context', private.capture_throw_context(r, rec.user_id, rec.ball_at)
    );
    calc := private.capture_chance(r.dex, rec.ball, CASE WHEN rec.prep = 'bait' THEN NULL ELSE rec.prep END, bait_count, player_count, rec.prep = 'bait', owns, private.variant_is_shiny(r.variant), 1.0, clk, cfg);
    v_odds := (calc->>'finalChance')::numeric;
    IF test_out = 'catch' THEN
      v_roll := 0; v_caught := true;
    ELSIF test_out = 'escape' THEN
      v_roll := 1; v_caught := false;
    ELSIF coalesce((calc->>'guaranteed')::boolean, false) THEN
      v_roll := 0; v_caught := true;
    ELSE
      v_roll := private.secure_random(); v_caught := v_roll < v_odds;
    END IF;
    UPDATE public.encounter_players ep SET chance = v_odds, roll = v_roll, caught = v_caught, result = CASE WHEN v_caught THEN 'Caught' ELSE 'Escaped' END, result_reason = CASE WHEN v_caught THEN 'caught' ELSE 'escaped' END WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
    INSERT INTO public.capture_log (round_id, user_id, dex, species_name, variant, gender, is_shiny, is_female, canonical_catch_rate, base_chance, ball_key, ball_multiplier, ball_condition_met, berry_key, berry_multiplier, honey_contributors, honey_participants, honey_multiplier, honey_contributor_multiplier, shiny_multiplier, event_multiplier, other_multiplier, raw_chance, final_chance, capture_roll, success, detail)
    VALUES (r.id, rec.user_id, r.dex, r.name, r.variant, r.gender, private.variant_is_shiny(r.variant), r.gender = 'Female', (calc->>'catchRate')::int, (calc->>'baseChance')::numeric, calc->'ball'->>'key', (calc->'ball'->>'multiplier')::numeric, (calc->'ball'->>'conditionMet')::boolean, calc->'berry'->>'key', (calc->'berry'->>'multiplier')::numeric, (calc->'honey'->>'contributors')::int, (calc->'honey'->>'participants')::int, (calc->'honey'->>'multiplier')::numeric, (calc->>'honeyContributorMultiplier')::numeric, (calc->>'shinyMultiplier')::numeric, (calc->>'eventMultiplier')::numeric, (calc->>'otherMultiplier')::numeric, (calc->>'rawChance')::numeric, v_odds, v_roll, v_caught, calc || jsonb_build_object('testOutcome', test_out, 'formId', form_id))
    ON CONFLICT (round_id, user_id) DO NOTHING;
    IF v_caught THEN
      INSERT INTO public.play_console_log (round_id, user_id, display_name, kind, item, message)
      SELECT r.id, rec.user_id, who, 'caught', species, '⭐ ' || who || ' caught ' || species || '!'
      WHERE NOT EXISTS (SELECT 1 FROM public.play_console_log l WHERE l.round_id = r.id AND l.user_id = rec.user_id AND l.kind = 'caught') ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.play_console_log (round_id, user_id, display_name, kind, item, message)
      SELECT r.id, rec.user_id, who, 'escaped', species, '✖ ' || who || ' was unable to catch ' || species || '. Better luck next encounter!'
      WHERE NOT EXISTS (SELECT 1 FROM public.play_console_log l WHERE l.round_id = r.id AND l.user_id = rec.user_id AND l.kind = 'escaped') ON CONFLICT DO NOTHING;
    END IF;
    IF v_caught AND NOT EXISTS (SELECT 1 FROM public.catches c WHERE c.round_id = rec.round_id AND c.user_id = rec.user_id) THEN
      -- Same level fill as live stamp_catch_row when INSERT omits level.
      v_level := coalesce(private.encounter_pokemon_level(r.dex, r.id), 5);
      v_mat := private.materialize_streamlink_catch(
        rec.user_id,
        form_id,
        v_level,
        'catch',
        'play:' || rec.round_id::text || ':' || rec.user_id::text,
        rec.ball,
        rec.round_id,
        private.variant_is_shiny(r.variant),
        'sl-ref-20261013-227b573',
        NULL,
        r.variant,
        species,
        r.gender
      );
      IF coalesce(v_mat->>'ok', 'false') IS DISTINCT FROM 'true' THEN
        IF coalesce((v_mat->>'replay')::boolean, false)
           OR coalesce(v_mat->'errors', '[]'::jsonb) ? 'already-settled' THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.catches c
            WHERE c.round_id = rec.round_id AND c.user_id = rec.user_id
          ) THEN
            RAISE EXCEPTION 'wire-materialize-failed: already-settled-without-catch';
          END IF;
        ELSE
          RAISE EXCEPTION 'wire-materialize-failed: %', coalesce(v_mat->>'errors', v_mat::text);
        END IF;
      END IF;
    END IF;
  END LOOP;
  UPDATE public.encounter_rounds SET resolved = true, paused_at = null, last_action = coalesce(throw_line, last_action, 'Results locked in'), updated_at = now() WHERE id = r.id RETURNING * INTO r;
  RETURN r;
END;
$function$;

COMMENT ON FUNCTION private.settle_if_needed(encounter_rounds) IS
  'A19-WIRE D47: successful captures call materialize_streamlink_catch. Odds, bag spends, and result copy stay in this function. stamp_catch_row is unchanged. No test hooks.';

COMMIT;
