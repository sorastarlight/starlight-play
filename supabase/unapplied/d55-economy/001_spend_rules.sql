-- D55 encounter economy. Branch-only. Do not apply to production.
-- Supersedes supabase/unapplied/d54-economy/001_spend_ledger.sql.
-- WIRE stays off. Capture odds and attendance grants are unchanged.
--
-- Borrowed Poké Balls stay free. public.play_throw marks result_reason
-- standard_throw for the safety-net throw. This function does not spend
-- those rows. An owned throw still debits one item and writes BAG_SPEND.
--
-- Insufficient inventory uses SQLSTATE NB001. Other errors, including a
-- failed ledger insert, propagate and roll the settlement back.
-- Extra balls and capture berries decrement in one locked UPDATE.

CREATE OR REPLACE FUNCTION private.spend_bag_item(p_uid uuid, p_item text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  spent int;
BEGIN
  IF p_item = 'berry' THEN
    UPDATE public.inventories SET berry = berry - 1, updated_at = now()
      WHERE user_id = p_uid AND berry > 0;
  ELSIF p_item = 'bait' THEN
    UPDATE public.inventories SET bait = bait - 1, updated_at = now()
      WHERE user_id = p_uid AND bait > 0;
  ELSIF p_item = 'pokeball' THEN
    UPDATE public.inventories SET pokeball = pokeball - 1, updated_at = now()
      WHERE user_id = p_uid AND pokeball > 0;
  ELSIF p_item = 'greatball' THEN
    UPDATE public.inventories SET greatball = greatball - 1, updated_at = now()
      WHERE user_id = p_uid AND greatball > 0;
  ELSIF p_item = 'ultraball' THEN
    UPDATE public.inventories SET ultraball = ultraball - 1, updated_at = now()
      WHERE user_id = p_uid AND ultraball > 0;
  ELSIF private.is_capture_berry(p_item) THEN
    UPDATE public.inventories
      SET berries = jsonb_set(
            coalesce(berries, '{}'::jsonb),
            ARRAY[p_item],
            to_jsonb(coalesce((berries->>p_item)::int, 0) - 1)
          ),
          updated_at = now()
      WHERE user_id = p_uid
        AND coalesce((berries->>p_item)::int, 0) > 0;
  ELSIF p_item = ANY (private.extra_ball_keys()) THEN
    UPDATE public.inventories
      SET balls = jsonb_set(
            coalesce(balls, '{}'::jsonb),
            ARRAY[p_item],
            to_jsonb(coalesce((balls->>p_item)::int, 0) - 1)
          ),
          updated_at = now()
      WHERE user_id = p_uid
        AND coalesce((balls->>p_item)::int, 0) > 0;
  ELSE
    RAISE EXCEPTION 'Unknown item.';
  END IF;
  GET DIAGNOSTICS spent = ROW_COUNT;
  IF spent = 0 THEN
    RAISE EXCEPTION 'You have no % left. No item spent.', private.item_label(p_item)
      USING ERRCODE = 'NB001';
  END IF;
  INSERT INTO public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
  VALUES (
    p_uid, p_item, -1, 'BAG_SPEND', NULL,
    'bag-spend:' || p_uid::text || ':' || p_item || ':' || gen_random_uuid()::text
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.announce_throws(p_round uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  rec public.encounter_players%ROWTYPE;
  who text;
  line text;
  last_line text;
BEGIN
  FOR rec IN
    SELECT ep.*
    FROM public.encounter_players ep
    WHERE ep.round_id = p_round
      AND ep.ball IS NOT NULL
      AND ep.throw_processed = false
    ORDER BY coalesce(private.trainer_label(ep.user_id), 'Trainer'), ep.user_id
    FOR UPDATE
  LOOP
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    IF rec.result_reason IS DISTINCT FROM 'standard_throw' THEN
      BEGIN
        PERFORM private.spend_bag_item(rec.user_id, rec.ball);
      EXCEPTION
        WHEN SQLSTATE 'NB001' THEN
          UPDATE public.encounter_players ep
            SET throw_processed = true, result_reason = 'no_ball_left'
            WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
          INSERT INTO public.play_console_log (round_id, user_id, display_name, kind, item, message)
          SELECT p_round, rec.user_id, who, 'timeout', rec.ball,
                 '⌛ ' || who || ' ran out of ' || private.item_label(rec.ball) || 's before the throw.'
          WHERE NOT EXISTS (
            SELECT 1 FROM public.play_console_log l
            WHERE l.round_id = p_round AND l.user_id = rec.user_id AND l.kind = 'timeout'
          )
          ON CONFLICT DO NOTHING;
          CONTINUE;
      END;
    END IF;
    UPDATE public.encounter_players ep
      SET throw_processed = true
      WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
    line := who || ' has thrown ' || private.a_or_an(private.item_label(rec.ball)) || '!';
    PERFORM private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    UPDATE public.play_console_log l
      SET message = line
      WHERE l.round_id = p_round
        AND l.user_id = rec.user_id
        AND l.kind = 'threw'
        AND coalesce(l.message, '') = '';
    last_line := line;
  END LOOP;

  FOR rec IN
    SELECT ep.*
    FROM public.encounter_players ep
    WHERE ep.round_id = p_round AND ep.ball IS NULL AND ep.result IS NULL
  LOOP
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    INSERT INTO public.play_console_log (round_id, user_id, display_name, kind, item, message)
    SELECT p_round, rec.user_id, who, 'timeout', NULL,
           '⌛ ' || who || ' did not choose a Poké Ball in time.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.play_console_log l
      WHERE l.round_id = p_round AND l.user_id = rec.user_id AND l.kind = 'timeout'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN last_line;
END;
$function$;
