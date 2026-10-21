-- Proposed owner-only worker. This file does not create or enable a job.
CREATE FUNCTION private.process_species_familiarity()
RETURNS jsonb LANGUAGE plpgsql
SET search_path TO pg_catalog AS $function$
DECLARE state text; admitted integer:=0; delivered integer:=0; health jsonb;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtextextended('streamlink:species-familiarity-worker',0)) THEN
  RETURN jsonb_build_object('status','busy','reconciled',0,'delivered',0);
 END IF;
 SELECT a.lifecycle INTO state FROM private.species_mastery_activation a WHERE a.singleton FOR SHARE;
 IF state IS NULL OR state NOT IN('active','draining') THEN
  RETURN jsonb_build_object('status',coalesce(state,'unavailable'),'reconciled',0,'delivered',0);
 END IF;
 IF state='active' THEN admitted:=private.reconcile_species_mastery_outbox(25);END IF;
 delivered:=private.deliver_species_mastery_outbox(25);
 SELECT jsonb_build_object('pending',count(*)filter(where o.status='pending'),
  'rejected',count(*)filter(where o.status='rejected'),'exhausted',count(*)filter(where o.status='exhausted'))
 INTO health FROM private.species_mastery_outbox o;
 RETURN jsonb_build_object('status',state,'reconciled',admitted,'delivered',delivered,'queue',health);
END;
$function$;
REVOKE ALL ON FUNCTION private.process_species_familiarity() FROM PUBLIC,anon,authenticated,service_role;
