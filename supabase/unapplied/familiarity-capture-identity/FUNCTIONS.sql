-- Definitions for the guarded packet generator; do not apply this file alone.
CREATE FUNCTION private.familiarity_capture_identity(p_catch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public, private AS $function$
DECLARE c public.catches%ROWTYPE; successes integer; original_trainer uuid; original_dex integer; log_id text;
BEGIN
 SELECT * INTO c FROM public.catches WHERE id=p_catch_id FOR SHARE;
 IF NOT FOUND OR c.round_id IS NULL OR c.server_inserted_at IS NULL
    OR NOT isfinite(c.server_inserted_at) OR c.server_inserted_at>clock_timestamp()+interval '2 minutes'
    OR private.round_is_test(c.round_id) THEN
  RAISE EXCEPTION 'Familiarity capture identity is unavailable' USING ERRCODE='23514';
 END IF;
 -- The immutable source key binds the original trainer even after ownership changes.
 PERFORM 1 FROM public.capture_log l WHERE l.round_id=c.round_id
   AND c.source_key='play:'||l.round_id::text||':'||l.user_id::text AND l.success IS TRUE FOR SHARE;
 SELECT count(*),min(l.user_id::text)::uuid,min(l.dex),min(l.id::text)
 INTO successes,original_trainer,original_dex,log_id
 FROM public.capture_log l WHERE l.round_id=c.round_id
   AND c.source_key='play:'||l.round_id::text||':'||l.user_id::text AND l.success IS TRUE;
 IF successes<>1 OR original_trainer IS NULL OR original_dex IS NULL OR original_dex NOT BETWEEN 1 AND 1025 THEN
  RAISE EXCEPTION 'Familiarity capture requires one unambiguous successful capture record' USING ERRCODE='23514';
 END IF;
 RETURN jsonb_build_object('version',1,'catch_id',c.id,'trainer_id',original_trainer,'dex',original_dex,
  'round_id',c.round_id,'source_key',c.source_key,'server_inserted_at',c.server_inserted_at,'capture_log_id',log_id);
END;
$function$;

CREATE OR REPLACE FUNCTION private.species_mastery_outbox_admit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public, private AS $function$
DECLARE state text; opened timestamptz; identity jsonb;
BEGIN
 SELECT a.lifecycle,a.activated_at INTO state,opened FROM private.species_mastery_activation a WHERE a.singleton FOR SHARE;
 IF opened IS NULL OR state IS NULL OR state NOT IN('active','paused') THEN
  RAISE EXCEPTION 'mastery outbox rejected: recording is not open' USING ERRCODE='23514';
 END IF;
 identity:=private.familiarity_capture_identity(NEW.catch_id);
 IF (identity->>'server_inserted_at')::timestamptz<opened THEN
  RAISE EXCEPTION 'mastery outbox rejected: specimen predates activation' USING ERRCODE='23514';
 END IF;
 IF NEW.capture_identity IS NOT NULL AND NEW.capture_identity IS DISTINCT FROM identity THEN
  RAISE EXCEPTION 'mastery outbox rejected: supplied capture identity differs' USING ERRCODE='23514';
 END IF;
 NEW.capture_identity:=identity;
 NEW.enqueued_at:=clock_timestamp();
 RETURN NEW;
END;
$function$;

CREATE FUNCTION private.freeze_familiarity_capture_identity()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO pg_catalog AS $function$
BEGIN
 IF NEW.catch_id IS DISTINCT FROM OLD.catch_id OR NEW.enqueued_at IS DISTINCT FROM OLD.enqueued_at
    OR NEW.capture_identity IS DISTINCT FROM OLD.capture_identity THEN
  RAISE EXCEPTION 'Familiarity capture identity is immutable' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.record_species_mastery_event(p_catch_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public, private AS $function$
DECLARE identity jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM public.species_mastery_events WHERE catch_id=p_catch_id) THEN RETURN p_catch_id;END IF;
 SELECT o.capture_identity INTO identity FROM private.species_mastery_outbox o WHERE o.catch_id=p_catch_id FOR SHARE;
 IF identity IS NULL THEN
  -- Historical delivered events remain replay-safe without inventing a snapshot.
  IF EXISTS(SELECT 1 FROM public.species_mastery_events WHERE catch_id=p_catch_id) THEN RETURN p_catch_id;END IF;
  RAISE EXCEPTION 'mastery event rejected: immutable capture identity is unavailable' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.species_mastery_events(catch_id,trainer_id,dex,round_id,source_key)
 VALUES(p_catch_id,(identity->>'trainer_id')::uuid,(identity->>'dex')::integer,(identity->>'round_id')::uuid,identity->>'source_key');
 RETURN p_catch_id;
EXCEPTION WHEN unique_violation THEN
 IF EXISTS(SELECT 1 FROM public.species_mastery_events WHERE catch_id=p_catch_id) THEN RETURN p_catch_id;END IF;
 RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION private.species_mastery_events_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public, private AS $function$
DECLARE identity jsonb; queued timestamptz; opened timestamptz; state text; drain timestamptz; inserted timestamptz;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'mastery events are immutable' USING ERRCODE='55000';END IF;
 SELECT o.capture_identity,o.enqueued_at INTO identity,queued FROM private.species_mastery_outbox o
 WHERE o.catch_id=NEW.catch_id AND o.status='pending' FOR SHARE;
 IF identity IS NULL OR identity->>'version' IS DISTINCT FROM '1'
  OR NEW.catch_id::text IS DISTINCT FROM identity->>'catch_id'
  OR NEW.trainer_id::text IS DISTINCT FROM identity->>'trainer_id'
  OR NEW.dex::text IS DISTINCT FROM identity->>'dex'
  OR NEW.round_id::text IS DISTINCT FROM identity->>'round_id'
  OR NEW.source_key IS DISTINCT FROM identity->>'source_key' THEN
  RAISE EXCEPTION 'mastery event rejected: event does not match immutable capture identity' USING ERRCODE='23514';
 END IF;
 SELECT a.lifecycle,a.activated_at,a.drain_started_at INTO state,opened,drain
 FROM private.species_mastery_activation a WHERE a.singleton FOR SHARE;
 IF opened IS NULL OR state IS NULL OR state NOT IN('active','draining') THEN
  RAISE EXCEPTION 'mastery event rejected: recording is not active' USING ERRCODE='23514';
 END IF;
 inserted:=(identity->>'server_inserted_at')::timestamptz;
 IF inserted IS NULL OR NOT isfinite(inserted) OR inserted<opened OR inserted>clock_timestamp()+interval '2 minutes' THEN
  RAISE EXCEPTION 'mastery event rejected: invalid activation or insertion time' USING ERRCODE='23514';
 END IF;
 IF state='draining' AND (drain IS NULL OR queued IS NULL OR queued>drain) THEN
  RAISE EXCEPTION 'mastery event rejected: recording is closed to new work' USING ERRCODE='23514';
 END IF;
 -- Admission already verified the successful server log. Later specimen/log/round
 -- deletion or changes must not erase that original earned capture identity.
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.reconcile_species_mastery_outbox(p_limit integer DEFAULT 25)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public, private AS $function$
DECLARE opened timestamptz; state text; candidate record; added integer; total integer:=0;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>200 THEN p_limit:=25;END IF;
 SELECT a.activated_at,a.lifecycle INTO opened,state FROM private.species_mastery_activation a WHERE a.singleton FOR SHARE;
 IF opened IS NULL OR state IS NULL OR state NOT IN('active','paused') THEN RETURN 0;END IF;
 FOR candidate IN
  SELECT c.id FROM public.catches c
  WHERE c.server_inserted_at>=opened AND isfinite(c.server_inserted_at)
   AND c.server_inserted_at<=clock_timestamp()+interval '2 minutes'
   AND c.round_id IS NOT NULL AND NOT private.round_is_test(c.round_id)
   AND EXISTS(SELECT 1 FROM public.capture_log l WHERE l.round_id=c.round_id AND l.success IS TRUE
    AND l.dex BETWEEN 1 AND 1025 AND c.source_key='play:'||l.round_id::text||':'||l.user_id::text)
   AND (SELECT count(*) FROM public.capture_log l WHERE l.round_id=c.round_id AND l.success IS TRUE
    AND c.source_key='play:'||l.round_id::text||':'||l.user_id::text)=1
   AND NOT EXISTS(SELECT 1 FROM private.species_mastery_outbox o WHERE o.catch_id=c.id)
   AND NOT EXISTS(SELECT 1 FROM public.species_mastery_events e WHERE e.catch_id=c.id)
  ORDER BY c.server_inserted_at,c.id LIMIT p_limit FOR SHARE OF c SKIP LOCKED
 LOOP
  BEGIN
   INSERT INTO private.species_mastery_outbox(catch_id) VALUES(candidate.id) ON CONFLICT(catch_id) DO NOTHING;
   GET DIAGNOSTICS added=ROW_COUNT;total:=total+added;
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;
 END LOOP;
 RETURN total;
END;
$function$;
