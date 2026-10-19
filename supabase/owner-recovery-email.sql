-- Additive recovery-email boundary. Sending starts disabled pending hosted template review.
BEGIN;
CREATE TABLE private.owner_recovery_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.owner_recovery_settings(id) VALUES(true);
CREATE TABLE private.owner_recovery_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL, session_id uuid NOT NULL,
  target uuid NOT NULL, revision text NOT NULL, masked_destination text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE TABLE private.owner_recovery_receipts (
  id uuid PRIMARY KEY, challenge_id uuid UNIQUE NOT NULL REFERENCES private.owner_recovery_challenges(id),
  actor uuid NOT NULL, target uuid NOT NULL, reason text NOT NULL, case_ref text NOT NULL,
  state text NOT NULL CHECK(state IN ('dispatching','accepted','failed','uncertain')),
  created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX owner_recovery_actor_time ON private.owner_recovery_receipts(actor,created_at DESC);
CREATE INDEX owner_recovery_target_time ON private.owner_recovery_receipts(target,created_at DESC);
ALTER TABLE private.owner_recovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.owner_recovery_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.owner_recovery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.owner_recovery_settings,private.owner_recovery_challenges,private.owner_recovery_receipts FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.require_recent_recovery_owner() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); sid uuid; fresh boolean;
BEGIN
  IF caller IS NULL OR private.play_staff_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
  END IF;
  BEGIN sid:=(auth.jwt()->>'session_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN sid:=NULL; END;
  IF NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
    WHERE s.id=sid AND s.user_id=caller AND (s.not_after IS NULL OR s.not_after>now())
      AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN
    RAISE EXCEPTION 'Sign in again before recovery actions' USING ERRCODE='42501';
  END IF;
  -- JWT is verified by Auth at the Edge and signed by the project at the RPC boundary.
  -- Refresh-token issuance time is deliberately not accepted as recent authentication.
  SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(auth.jwt()->'amr')='array' THEN auth.jwt()->'amr' ELSE '[]'::jsonb END
  ) a WHERE a->>'method' IN ('password','oauth','totp','webauthn')
    AND CASE WHEN a->>'timestamp' ~ '^[0-9]{1,12}$' THEN
      (a->>'timestamp')::bigint BETWEEN extract(epoch FROM now()-interval '5 minutes') AND extract(epoch FROM now()+interval '30 seconds')
    ELSE false END) INTO fresh;
  IF NOT fresh THEN RAISE EXCEPTION 'Sign in again before recovery actions' USING ERRCODE='42501'; END IF;
  RETURN sid;
END;
$$;
REVOKE ALL ON FUNCTION private.require_recent_recovery_owner() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.owner_recovery_email_gate(p_target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  RETURN jsonb_build_object('enabled',coalesce((SELECT enabled FROM private.owner_recovery_settings WHERE id),false));
END;
$$;

CREATE FUNCTION public.owner_recovery_email_prepare(p_target uuid,p_revision text,p_masked text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE sid uuid; challenge private.owner_recovery_challenges;
BEGIN
  sid:=private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  IF NOT coalesce((SELECT enabled FROM private.owner_recovery_settings WHERE id),false) THEN
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

CREATE FUNCTION public.owner_recovery_email_reserve(p_request uuid,p_challenge uuid,p_target uuid,p_revision text,p_reason text,p_case_ref text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE sid uuid; challenge private.owner_recovery_challenges; receipt private.owner_recovery_receipts;
  reason text:=btrim(coalesce(p_reason,'')); case_ref text:=btrim(coalesce(p_case_ref,''));
BEGIN
  sid:=private.require_recent_recovery_owner();
  PERFORM public.owner_account_diagnostics_context(p_target);
  IF NOT coalesce((SELECT enabled FROM private.owner_recovery_settings WHERE id),false) THEN
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

-- Only the Edge service client can record provider outcomes; clients cannot forge success.
CREATE FUNCTION public.owner_recovery_email_finish(p_request uuid,p_state text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF p_state NOT IN ('accepted','failed','uncertain') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  UPDATE private.owner_recovery_receipts SET state=p_state,finished_at=now()
    WHERE id=p_request AND state='dispatching';
END;
$$;
REVOKE ALL ON FUNCTION public.owner_recovery_email_gate(uuid),public.owner_recovery_email_prepare(uuid,text,text),public.owner_recovery_email_reserve(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_recovery_email_gate(uuid),public.owner_recovery_email_prepare(uuid,text,text),public.owner_recovery_email_reserve(uuid,uuid,uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.owner_recovery_email_finish(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.owner_recovery_email_finish(uuid,text) TO service_role;
COMMIT;
