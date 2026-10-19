-- Recovery audit lifecycle. Policy is intentionally unset until owner selects it.
BEGIN;
ALTER TABLE private.owner_recovery_settings ADD COLUMN retention_days integer CHECK(retention_days BETWEEN 30 AND 730);
ALTER TABLE private.owner_recovery_settings ADD COLUMN qa_target uuid;

CREATE FUNCTION private.prune_owner_recovery_history() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE days integer; receipts integer:=0; challenges integer:=0;
BEGIN
  SELECT retention_days INTO days FROM private.owner_recovery_settings WHERE id;
  IF days IS NULL THEN RETURN jsonb_build_object('state','policy_unset'); END IF;
  -- Use the same lock as dispatch reservation. Unresolved sends are never purged.
  PERFORM pg_advisory_xact_lock(814260019);
  DELETE FROM private.owner_recovery_receipts
    WHERE state IN ('accepted','failed') AND finished_at IS NOT NULL
      AND finished_at<now()-make_interval(days=>days);
  GET DIAGNOSTICS receipts=ROW_COUNT;
  DELETE FROM private.owner_recovery_challenges c
    WHERE c.expires_at<now()-interval '1 day'
      AND NOT EXISTS(SELECT 1 FROM private.owner_recovery_receipts r WHERE r.challenge_id=c.id);
  GET DIAGNOSTICS challenges=ROW_COUNT;
  RETURN jsonb_build_object('state','complete','receipts',receipts,'challenges',challenges);
END;
$$;
REVOKE ALL ON FUNCTION private.prune_owner_recovery_history() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.owner_recovery_email_gate(p_target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  RETURN jsonb_build_object('enabled',coalesce((SELECT enabled AND retention_days IS NOT NULL
    AND (qa_target IS NULL OR qa_target=p_target) FROM private.owner_recovery_settings WHERE id),false));
END;
$$;
-- Gate is checked again inside mutators, so direct RPC calls cannot bypass the QA target.
CREATE FUNCTION private.recovery_target_enabled(p_target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce((SELECT enabled AND retention_days IS NOT NULL AND (qa_target IS NULL OR qa_target=p_target)
 FROM private.owner_recovery_settings WHERE id),false)
$$;
REVOKE ALL ON FUNCTION private.recovery_target_enabled(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.owner_recovery_email_prepare(p_target uuid,p_revision text,p_masked text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE sid uuid; challenge private.owner_recovery_challenges;
BEGIN
  sid:=private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  IF NOT private.recovery_target_enabled(p_target) THEN
    RETURN jsonb_build_object('state','disabled');
  END IF;
  IF p_revision !~ '^[a-f0-9]{64}$' OR p_masked !~ '^.•••@•••$' THEN
    RAISE EXCEPTION 'Invalid recovery snapshot' USING ERRCODE='22023';
  END IF;
  -- One outstanding confirmation per actor; no personal data in its revision.
  DELETE FROM private.owner_recovery_challenges c WHERE c.actor=auth.uid()
    AND NOT EXISTS(SELECT 1 FROM private.owner_recovery_receipts r WHERE r.challenge_id=c.id);
  INSERT INTO private.owner_recovery_challenges(actor,session_id,target,revision,masked_destination)
    VALUES(auth.uid(),sid,p_target,p_revision,p_masked) RETURNING * INTO challenge;
  RETURN jsonb_build_object('state','prepared','challengeId',challenge.id,'snapshotRevision',challenge.revision,
    'maskedDestination',challenge.masked_destination,'expiresAt',challenge.expires_at,'targetUuid',p_target);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_recovery_email_reserve(p_request uuid,p_challenge uuid,p_target uuid,p_revision text,p_reason text,p_case_ref text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE sid uuid; challenge private.owner_recovery_challenges; receipt private.owner_recovery_receipts;
  reason text:=btrim(coalesce(p_reason,'')); case_ref text:=btrim(coalesce(p_case_ref,''));
BEGIN
  sid:=private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  IF NOT private.recovery_target_enabled(p_target) THEN
    RETURN jsonb_build_object('state','disabled');
  END IF;
  IF p_request IS NULL OR length(reason)<3 OR length(reason)>1000 OR length(case_ref)>100 THEN
    RAISE EXCEPTION 'Enter a staff reason' USING ERRCODE='22023';
  END IF;
  -- Serialize reservation and limits across actors and targets (low-volume owner tool).
  PERFORM pg_advisory_xact_lock(814260019);
  SELECT * INTO challenge FROM private.owner_recovery_challenges WHERE id=p_challenge FOR UPDATE;
  IF NOT FOUND OR challenge.actor<>auth.uid() OR challenge.session_id<>sid OR challenge.target<>p_target
    OR challenge.revision IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION 'Recovery confirmation changed' USING ERRCODE='42501';
  END IF;
  SELECT * INTO receipt FROM private.owner_recovery_receipts WHERE id=p_request;
  IF FOUND THEN
    IF receipt.actor<>auth.uid() OR receipt.target<>p_target OR receipt.challenge_id<>p_challenge
      OR receipt.reason<>reason OR receipt.case_ref<>case_ref THEN
      RAISE EXCEPTION 'Recovery request changed' USING ERRCODE='42501';
    END IF;
    RETURN jsonb_build_object('state',CASE WHEN receipt.state='dispatching' THEN 'uncertain' ELSE receipt.state END,
      'receiptId',receipt.id,'dispatch',false);
  END IF;
  IF challenge.expires_at<=now() OR EXISTS(SELECT 1 FROM private.owner_recovery_receipts WHERE challenge_id=p_challenge) THEN
    RAISE EXCEPTION 'Recovery confirmation expired or used' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM private.owner_recovery_receipts WHERE target=p_target AND state IN ('dispatching','uncertain')) THEN
    RETURN jsonb_build_object('state','uncertain','dispatch',false);
  END IF;
  IF EXISTS(SELECT 1 FROM private.owner_recovery_receipts WHERE (actor=auth.uid() OR target=p_target) AND created_at>now()-interval '60 seconds')
    OR (SELECT count(*) FROM private.owner_recovery_receipts WHERE actor=auth.uid() AND created_at>now()-interval '1 hour')>=3
    OR (SELECT count(*) FROM private.owner_recovery_receipts WHERE target=p_target AND created_at>now()-interval '1 hour')>=2 THEN
    RETURN jsonb_build_object('state','limited','retryAfter',3600,'dispatch',false);
  END IF;
  INSERT INTO private.owner_recovery_receipts(id,challenge_id,actor,target,reason,case_ref,state)
    VALUES(p_request,p_challenge,auth.uid(),p_target,reason,case_ref,'dispatching');
  RETURN jsonb_build_object('state','dispatching','receiptId',p_request,'dispatch',true);
END;
$$;

COMMIT;
