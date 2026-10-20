-- Owner-approved recording-only activation. Executed once; do not rerun.
BEGIN;
DO $owner_activation$
DECLARE v_state private.species_mastery_activation%rowtype; v_opened timestamptz; v_count integer;
BEGIN
 SELECT * INTO v_state FROM private.species_mastery_activation WHERE singleton FOR UPDATE;
 IF NOT FOUND OR v_state.lifecycle IS DISTINCT FROM 'inactive' OR v_state.activated_at IS NOT NULL THEN
  RAISE EXCEPTION 'Activation baseline drift: stop without retry';
 END IF;
 IF (SELECT enabled FROM private.streamlink_wire_switch WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'WIRE baseline drift'; END IF;
 IF EXISTS(SELECT 1 FROM public.species_mastery_events) OR EXISTS(SELECT 1 FROM private.species_mastery_outbox) THEN RAISE EXCEPTION 'Familiarity ledgers are not empty'; END IF;
 IF md5((SELECT prosrc FROM pg_proc WHERE oid='private.activate_species_mastery_events()'::regprocedure)) IS DISTINCT FROM '75abaf722451fbc4b1818986ce6cbd71'
 OR md5((SELECT prosrc FROM pg_proc WHERE oid='private.settle_if_needed(public.encounter_rounds)'::regprocedure)) IS DISTINCT FROM '565c102d0a8c84a3dfd036653aca307c'
 OR md5((SELECT prosrc FROM pg_proc WHERE oid='private.round_is_active(public.encounter_rounds)'::regprocedure)) IS DISTINCT FROM '53d7e8a3f3894212e854618dc0663101'
 OR md5((SELECT prosrc FROM pg_proc WHERE oid='private.note_species_mastery_catch(uuid)'::regprocedure)) IS DISTINCT FROM '313944ac139f33465e57d86c0a1c5678'
 THEN RAISE EXCEPTION 'Function fingerprint drift'; END IF;
 SELECT count(*) INTO v_count FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='public.catches'::regclass AND t.tgenabled='O' AND (
 (t.tgname='catch_server_inserted_at' AND md5(p.prosrc)='b66ad1b961b3573a2c48947dfe0413ea') OR
 (t.tgname='catch_server_inserted_at_freeze' AND md5(p.prosrc)='ae884032419d5162ead315d0f216d76c') OR
 (t.tgname='species_mastery_caught_at_freeze' AND md5(p.prosrc)='046fb0fe991c2aa28f3b8fcbe39b42e9'));
 IF v_count<>3 THEN RAISE EXCEPTION 'Stamp/freeze trigger drift'; END IF;
 v_opened := private.activate_species_mastery_events();
 IF v_opened IS NULL OR NOT isfinite(v_opened) THEN RAISE EXCEPTION 'Invalid activation timestamp'; END IF;
 SELECT * INTO v_state FROM private.species_mastery_activation WHERE singleton;
 IF v_state.lifecycle IS DISTINCT FROM 'active' OR v_state.activated_at IS DISTINCT FROM v_opened THEN RAISE EXCEPTION 'Activation postcondition failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.species_mastery_events) OR EXISTS(SELECT 1 FROM private.species_mastery_outbox) OR
 (SELECT enabled FROM private.streamlink_wire_switch WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unexpected activation side effect'; END IF;
END
$owner_activation$;
COMMIT;
SELECT (SELECT row_to_json(a) FROM private.species_mastery_activation a WHERE singleton) activation,
 (SELECT count(*) FROM public.species_mastery_events) events,
 (SELECT count(*) FROM private.species_mastery_outbox) outbox,
 (SELECT enabled FROM private.streamlink_wire_switch WHERE id=1) wire_enabled;
