begin;set local lock_timeout='5s';set local statement_timeout='30s';
lock table public.catches,public.capture_log,public.species_mastery_events in share row exclusive mode;
lock table private.species_mastery_outbox in access exclusive mode;
do $guard$ begin
 if (select md5(coalesce(string_agg((to_jsonb(e))::text,chr(10) order by catch_id),'')) from public.species_mastery_events e) is distinct from 'a476c4feb92914658c40b77b8185bbd4' or (select md5(coalesce(string_agg((to_jsonb(o)-'capture_identity')::text,chr(10) order by catch_id),'')) from private.species_mastery_outbox o) is distinct from '481d252a68c0fb2a45ada0d85e06f466' or (select md5(coalesce(string_agg((to_jsonb(c))::text,chr(10) order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Capture/event/queue data drift';end if;
 if (select md5(prosrc) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'c3e2401751521a93e3c98bd858e1cae9' or (select proacl::text from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: deliver_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '49e59ca336a343a2765ab811c06c96b6' or (select proacl::text from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: enqueue_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '313944ac139f33465e57d86c0a1c5678' or (select proacl::text from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: note_species_mastery_catch';end if;
if (select md5(prosrc) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '6668eeadf1f98c2798595f826489e23e' or (select proacl::text from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: reconcile_species_mastery_outbox';end if;
if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '5e1402915cf10cfd0ca556eceaec4c7f' or (select proacl::text from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: record_species_mastery_event';end if;
if (select md5(prosrc) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'a33d9b63f44df44771b7d2d9a43cb2af' or (select proacl::text from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from null then raise exception 'Familiarity function/ACL drift: round_is_test';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '18fe5a1d2d139aeddda60fc0c6db3713' or (select proacl::text from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: species_mastery_events_guard';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '38cb51432739644e6d45077f852b1fa9' or (select proacl::text from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: species_mastery_outbox_admit';end if;
if (select md5(prosrc) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '0ccce9747f3b20c2f99b07a8883651a6' or (select proacl::text from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '{postgres=X/postgres}' then raise exception 'Familiarity function/ACL drift: requeue_species_mastery_outbox';end if;
 if (select to_jsonb(proconfig) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: deliver_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: enqueue_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: note_species_mastery_catch';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: reconcile_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: record_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from NULL or (select prosecdef from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from false or (select pg_get_userbyid(proowner) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: round_is_test';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_events_guard';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_outbox_admit';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: requeue_species_mastery_outbox';end if;
 if (select md5(coalesce(string_agg(jsonb_build_array(p.oid::regprocedure::text,md5(p.prosrc),p.proacl::text,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner))::text,chr(10) order by p.oid::regprocedure::text collate "C"),'')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and not(n.nspname='private' and p.proname in('species_mastery_outbox_admit','record_species_mastery_event','species_mastery_events_guard','reconcile_species_mastery_outbox','familiarity_capture_identity','freeze_familiarity_capture_identity'))) is distinct from '449267b257935b30703c517e35f34295' then raise exception 'Unrelated function catalog drift';end if;
 if exists(select 1 from private.species_mastery_outbox where status<>'delivered') then raise exception 'Outstanding queue requires a separately reviewed migration';end if;
 if (select activated_at from private.species_mastery_activation where singleton) is distinct from '2026-10-20T16:55:59.896904+00:00'::timestamptz then raise exception 'Activation cutoff drift';end if;
 if exists(select 1 from information_schema.columns where table_schema='private' and table_name='species_mastery_outbox' and column_name='capture_identity') then raise exception 'Capture identity already installed';end if;
end $guard$;
alter table private.species_mastery_outbox add column capture_identity jsonb;
alter table private.species_mastery_outbox add constraint familiarity_capture_identity_required check(capture_identity is not null or status='delivered');
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

create trigger freeze_familiarity_capture_identity before update on private.species_mastery_outbox for each row execute function private.freeze_familiarity_capture_identity();
revoke all on function private.familiarity_capture_identity(uuid) from PUBLIC,anon,authenticated,service_role;
revoke all on function private.freeze_familiarity_capture_identity() from PUBLIC,anon,authenticated,service_role;
do $verify$ begin
 if (select md5(coalesce(string_agg((to_jsonb(e))::text,chr(10) order by catch_id),'')) from public.species_mastery_events e) is distinct from 'a476c4feb92914658c40b77b8185bbd4' or (select md5(coalesce(string_agg((to_jsonb(o)-'capture_identity')::text,chr(10) order by catch_id),'')) from private.species_mastery_outbox o) is distinct from '481d252a68c0fb2a45ada0d85e06f466' or (select md5(coalesce(string_agg((to_jsonb(c))::text,chr(10) order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Capture/event/queue data drift';end if;
 if (select md5(coalesce(string_agg(jsonb_build_array(p.oid::regprocedure::text,md5(p.prosrc),p.proacl::text,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner))::text,chr(10) order by p.oid::regprocedure::text collate "C"),'')) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and not(n.nspname='private' and p.proname in('species_mastery_outbox_admit','record_species_mastery_event','species_mastery_events_guard','reconcile_species_mastery_outbox','familiarity_capture_identity','freeze_familiarity_capture_identity'))) is distinct from '449267b257935b30703c517e35f34295' then raise exception 'Unrelated function catalog drift';end if;
 if (select to_jsonb(proconfig) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: deliver_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.enqueue_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: enqueue_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.note_species_mastery_catch(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: note_species_mastery_catch';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: reconcile_species_mastery_outbox';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: record_species_mastery_event';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from NULL or (select prosecdef from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from false or (select pg_get_userbyid(proowner) from pg_proc where oid='private.round_is_test(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: round_is_test';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_events_guard';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: species_mastery_outbox_admit';end if;
if (select to_jsonb(proconfig) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from '["search_path=pg_catalog, public, private"]'::jsonb or (select prosecdef from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from true or (select pg_get_userbyid(proowner) from pg_proc where oid='private.requeue_species_mastery_outbox(uuid)'::regprocedure) is distinct from 'postgres' then raise exception 'Function attribute drift: requeue_species_mastery_outbox';end if;
 if (select md5(prosrc) from pg_proc where oid='private.familiarity_capture_identity(uuid)'::regprocedure) is distinct from 'c78768599888d786e781ec18a7000c33' then raise exception 'Installed source mismatch';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_outbox_admit()'::regprocedure) is distinct from 'efd7d332b2ab9f3d0283accd08a6f02a' then raise exception 'Installed source mismatch';end if;
if (select md5(prosrc) from pg_proc where oid='private.freeze_familiarity_capture_identity()'::regprocedure) is distinct from 'eefcec159767d8366b6805645db2b829' then raise exception 'Installed source mismatch';end if;
if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '639f65cdaac61ff00604481bcad0a71f' then raise exception 'Installed source mismatch';end if;
if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from 'b42d8a354c079ddc9f56e4f86e930950' then raise exception 'Installed source mismatch';end if;
if (select md5(prosrc) from pg_proc where oid='private.reconcile_species_mastery_outbox(integer)'::regprocedure) is distinct from '90390247a30521352ddb9dbe9710160b' then raise exception 'Installed source mismatch';end if;
 if exists(select 1 from private.species_mastery_outbox where capture_identity is not null) then raise exception 'Unexpected historical backfill';end if;
 if has_table_privilege('anon','private.species_mastery_outbox','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','private.species_mastery_outbox','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Queue browser access';end if;
end $verify$;commit;
