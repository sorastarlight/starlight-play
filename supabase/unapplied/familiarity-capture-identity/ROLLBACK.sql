begin;set local lock_timeout='5s';set local statement_timeout='30s';
lock table public.catches,public.capture_log,public.species_mastery_events in share row exclusive mode;
lock table private.species_mastery_outbox in access exclusive mode;
do $guard$ begin
 if (select md5(coalesce(string_agg((to_jsonb(e))::text,chr(10) order by catch_id),'')) from public.species_mastery_events e) is distinct from 'a476c4feb92914658c40b77b8185bbd4' or (select md5(coalesce(string_agg((to_jsonb(o)-'capture_identity')::text,chr(10) order by catch_id),'')) from private.species_mastery_outbox o) is distinct from '481d252a68c0fb2a45ada0d85e06f466' or (select md5(coalesce(string_agg((to_jsonb(c))::text,chr(10) order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Capture/event/queue data drift';end if;
 if (select md5(coalesce(string_agg(jsonb_build_array(p.oid::regprocedure::text,md5(p.prosrc),p.proacl::text,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner))::text,chr(10) order by p.oid::regprocedure::text collate "C"),'')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and not(n.nspname='private' and p.proname in('species_mastery_outbox_admit','record_species_mastery_event','species_mastery_events_guard','reconcile_species_mastery_outbox','familiarity_capture_identity','freeze_familiarity_capture_identity'))) is distinct from '449267b257935b30703c517e35f34295' then raise exception 'Unrelated function catalog drift';end if;
 if exists(select 1 from private.species_mastery_outbox where capture_identity is not null) then raise exception 'New snapshot rows require a fresh rollback review';end if;
 if (select md5(prosrc) from pg_proc where oid='private.familiarity_capture_identity(uuid)'::regprocedure) is distinct from 'c78768599888d786e781ec18a7000c33' then raise exception 'Rollback source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'efd7d332b2ab9f3d0283accd08a6f02a' then raise exception 'Rollback source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.freeze_familiarity_capture_identity()'::regprocedure) is distinct from 'eefcec159767d8366b6805645db2b829' then raise exception 'Rollback source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '639f65cdaac61ff00604481bcad0a71f' then raise exception 'Rollback source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'b42d8a354c079ddc9f56e4f86e930950' then raise exception 'Rollback source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '90390247a30521352ddb9dbe9710160b' then raise exception 'Rollback source drift';end if;
end $guard$;
drop trigger freeze_familiarity_capture_identity on private.species_mastery_outbox;
CREATE OR REPLACE FUNCTION private.reconcile_species_mastery_outbox(p_limit integer DEFAULT 25)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  opened timestamptz;
  lifecycle text;
  inserted integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 25;
  END IF;
  SELECT activated_at, a.lifecycle INTO opened, lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF opened IS NULL OR lifecycle NOT IN ('active', 'paused') THEN
    RETURN 0;
  END IF;
  INSERT INTO private.species_mastery_outbox (catch_id)
  SELECT c.id
  FROM public.catches AS c
  WHERE c.server_inserted_at IS NOT NULL
    AND c.server_inserted_at >= opened
    AND c.server_inserted_at <= clock_timestamp() + interval '2 minutes'
    AND c.source_key IS NOT NULL
    AND split_part(c.source_key, ':', 1) = 'play'
    AND split_part(c.source_key, ':', 2) = c.round_id::text
    AND split_part(c.source_key, ':', 3) = c.user_id::text
    AND split_part(c.source_key, ':', 4) = ''
    AND c.round_id IS NOT NULL
    AND NOT private.round_is_test(c.round_id)
    AND EXISTS (
      SELECT 1
      FROM public.capture_log AS log
      WHERE log.round_id = c.round_id
        AND log.user_id = c.user_id
        AND log.success IS TRUE
        AND (log.dex IS NULL OR log.dex = c.dex)
    )
    AND NOT EXISTS (
      SELECT 1 FROM private.species_mastery_outbox AS queued WHERE queued.catch_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.species_mastery_events AS earned WHERE earned.catch_id = c.id
    )
  ORDER BY c.server_inserted_at, c.id
  LIMIT p_limit
  ON CONFLICT (catch_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$function$
;
CREATE OR REPLACE FUNCTION private.record_species_mastery_event(p_catch_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  specimen public.catches%ROWTYPE;
BEGIN
  IF p_catch_id IS NULL THEN
    RAISE EXCEPTION 'mastery event rejected: missing specimen' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO specimen FROM public.catches WHERE id = p_catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery event rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
  VALUES (specimen.id, specimen.user_id, specimen.dex, specimen.round_id, specimen.source_key);
  RETURN specimen.id;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.species_mastery_events WHERE catch_id = p_catch_id
    ) THEN
      RETURN p_catch_id;
    END IF;
    RAISE;
END;
$function$
;
CREATE OR REPLACE FUNCTION private.species_mastery_events_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  specimen public.catches%ROWTYPE;
  activated_at timestamptz;
  lifecycle text;
  drain_started_at timestamptz;
  inserted_at timestamptz;
  queued_at timestamptz;
  logged boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'mastery events are immutable' USING ERRCODE = '55000';
  END IF;

  SELECT * INTO specimen FROM public.catches WHERE id = NEW.catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery event rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  IF NEW.trainer_id IS DISTINCT FROM specimen.user_id
     OR NEW.dex IS DISTINCT FROM specimen.dex
     OR NEW.round_id IS DISTINCT FROM specimen.round_id
     OR NEW.source_key IS DISTINCT FROM specimen.source_key THEN
    RAISE EXCEPTION 'mastery event rejected: event does not match the specimen' USING ERRCODE = '23514';
  END IF;
  IF specimen.round_id IS NULL THEN
    RAISE EXCEPTION 'mastery event rejected: no encounter round' USING ERRCODE = '23514';
  END IF;

  SELECT a.activated_at, a.lifecycle, a.drain_started_at
    INTO activated_at, lifecycle, drain_started_at
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF activated_at IS NULL OR lifecycle IS DISTINCT FROM 'active' AND lifecycle IS DISTINCT FROM 'draining' THEN
    RAISE EXCEPTION 'mastery event rejected: recording is not active' USING ERRCODE = '23514';
  END IF;

  inserted_at := specimen.server_inserted_at;
  IF inserted_at IS NULL
     OR inserted_at = 'infinity'::timestamptz
     OR inserted_at = '-infinity'::timestamptz
     OR inserted_at > clock_timestamp() + interval '2 minutes' THEN
    RAISE EXCEPTION 'mastery event rejected: insertion time is not server-authoritative' USING ERRCODE = '23514';
  END IF;
  IF inserted_at < activated_at THEN
    RAISE EXCEPTION 'mastery event rejected: specimen predates activation' USING ERRCODE = '23514';
  END IF;
  IF lifecycle = 'draining' THEN
    SELECT o.enqueued_at INTO queued_at
    FROM private.species_mastery_outbox AS o
    WHERE o.catch_id = specimen.id
      AND o.status = 'pending'
      AND o.enqueued_at <= drain_started_at;
    IF queued_at IS NULL THEN
      RAISE EXCEPTION 'mastery event rejected: recording is closed to new work' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF specimen.source_key IS NULL
     OR split_part(specimen.source_key, ':', 1) <> 'play'
     OR split_part(specimen.source_key, ':', 2) IS DISTINCT FROM specimen.round_id::text
     OR split_part(specimen.source_key, ':', 3) IS DISTINCT FROM specimen.user_id::text
     OR split_part(specimen.source_key, ':', 4) <> '' THEN
    RAISE EXCEPTION 'mastery event rejected: source key is not this play capture' USING ERRCODE = '23514';
  END IF;
  IF private.round_is_test(specimen.round_id) THEN
    RAISE EXCEPTION 'mastery event rejected: test round' USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM public.capture_log
  WHERE round_id = specimen.round_id
    AND user_id = specimen.user_id
  FOR SHARE;
  SELECT true INTO logged
  FROM public.capture_log
  WHERE round_id = specimen.round_id
    AND user_id = specimen.user_id
    AND success IS TRUE
    AND (dex IS NULL OR dex = specimen.dex);
  IF logged IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'mastery event rejected: capture was not successful' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION private.species_mastery_outbox_admit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  lifecycle text;
BEGIN
  SELECT a.lifecycle INTO lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF lifecycle IS DISTINCT FROM 'active' AND lifecycle IS DISTINCT FROM 'paused' THEN
    RAISE EXCEPTION 'mastery outbox rejected: recording is not open' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
;
drop function private.familiarity_capture_identity(uuid) restrict;
drop function private.freeze_familiarity_capture_identity() restrict;
alter table private.species_mastery_outbox drop constraint familiarity_capture_identity_required;
alter table private.species_mastery_outbox drop column capture_identity restrict;
do $verify$ begin if (select md5(coalesce(string_agg((to_jsonb(e))::text,chr(10) order by catch_id),'')) from public.species_mastery_events e) is distinct from 'a476c4feb92914658c40b77b8185bbd4' or (select md5(coalesce(string_agg((to_jsonb(o)-'capture_identity')::text,chr(10) order by catch_id),'')) from private.species_mastery_outbox o) is distinct from '481d252a68c0fb2a45ada0d85e06f466' or (select md5(coalesce(string_agg((to_jsonb(c))::text,chr(10) order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Capture/event/queue data drift';end if; if (select md5(prosrc) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'c3e2401751521a93e3c98bd858e1cae9' or (select proacl::text from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: deliver_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '49e59ca336a343a2765ab811c06c96b6' or (select proacl::text from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: enqueue_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '313944ac139f33465e57d86c0a1c5678' or (select proacl::text from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: note_species_mastery_catch';end if;
if (select md5(prosrc) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '6668eeadf1f98c2798595f826489e23e' or (select proacl::text from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: reconcile_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '5e1402915cf10cfd0ca556eceaec4c7f' or (select proacl::text from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: record_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'a33d9b63f44df44771b7d2d9a43cb2af' or (select proacl::text from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from null then raise exception 'Familiarity function/ACL drift: round_is_test';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '18fe5a1d2d139aeddda60fc0c6db3713' or (select proacl::text from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: species_mastery_events_guard';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '38cb51432739644e6d45077f852b1fa9' or (select proacl::text from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: species_mastery_outbox_admit';end if;
if (select md5(prosrc) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '0ccce9747f3b20c2f99b07a8883651a6' or (select proacl::text from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: requeue_species_mastery_outbox';end if; if (select to_jsonb(proconfig) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: deliver_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: enqueue_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: note_species_mastery_catch';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: reconcile_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: record_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from NULL or (select prosecdef from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from false or (select pg_get_userbyid(proowner) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: round_is_test';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_events_guard';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_outbox_admit';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: requeue_species_mastery_outbox';end if; if (select md5(coalesce(string_agg(jsonb_build_array(p.oid::regprocedure::text,md5(p.prosrc),p.proacl::text,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner))::text,chr(10) order by p.oid::regprocedure::text collate "C"),'')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and not(n.nspname='private' and p.proname in('species_mastery_outbox_admit','record_species_mastery_event','species_mastery_events_guard','reconcile_species_mastery_outbox','familiarity_capture_identity','freeze_familiarity_capture_identity'))) is distinct from '449267b257935b30703c517e35f34295' then raise exception 'Unrelated function catalog drift';end if; end $verify$;commit;
