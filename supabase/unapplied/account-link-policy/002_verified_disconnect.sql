-- Local implementation only. Requires001; no hosted execution/activation GO.
-- Provider identity removal uses Supabase Auth unlinkIdentity in the signed-in
-- client. These RPCs never delete from auth.identities or handle credentials.
BEGIN;
CREATE TABLE private.twitch_disconnect_requests (
  id uuid PRIMARY KEY, actor uuid NOT NULL REFERENCES public.profiles(id),
  identity_id uuid NOT NULL, twitch_id text NOT NULL, connection_id uuid,
  state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  finished_at timestamptz
);
CREATE UNIQUE INDEX twitch_disconnect_one_pending ON private.twitch_disconnect_requests(actor) WHERE state='prepared';
CREATE INDEX twitch_disconnect_actor_time ON private.twitch_disconnect_requests(actor,created_at DESC);
ALTER TABLE private.twitch_disconnect_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.twitch_disconnect_requests FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.require_twitch_disconnect_actor() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=private.require_twitch_policy_actor(); fresh boolean;
BEGIN
  IF NOT private.twitch_link_policy_active(v_actor) THEN
    RAISE EXCEPTION 'Verified Twitch disconnect is not enabled' USING ERRCODE='55000';
  END IF;
  IF private.streamlink_protected_trainer(v_actor) THEN
    RAISE EXCEPTION 'Protected Trainer changes require separate authorization' USING ERRCODE='42501';
  END IF;
  -- A fresh password sign-in proves the backup method works; hash presence
  -- alone or a token refresh is not sufficient. No password leaves Auth.
  SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(auth.jwt()->'amr')='array' THEN auth.jwt()->'amr' ELSE '[]'::jsonb END) a
    WHERE a->>'method'='password' AND CASE WHEN a->>'timestamp' ~ '^[0-9]{1,12}$' THEN
      (a->>'timestamp')::bigint BETWEEN extract(epoch FROM now()-interval '5 minutes') AND extract(epoch FROM now()+interval '30 seconds')
    ELSE false END) INTO fresh;
  IF NOT fresh OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=v_actor AND u.email_confirmed_at IS NOT NULL
      AND nullif(btrim(u.email),'') IS NOT NULL AND coalesce(u.encrypted_password,'')<>'') THEN
    RAISE EXCEPTION 'Verify an email login and sign in with its password before disconnecting Twitch' USING ERRCODE='42501';
  END IF;
  RETURN v_actor;
END;
$$;

CREATE FUNCTION public.play_prepare_twitch_disconnect(p_twitch_user_id text,p_request_uuid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=private.require_twitch_disconnect_actor(); ident text:=private.twitch_numeric_id(p_twitch_user_id);
  req private.twitch_disconnect_requests; identity_uuid uuid; conn public.twitch_connections;
BEGIN
  IF p_request_uuid IS NULL OR ident IS NULL THEN RAISE EXCEPTION 'Select a Twitch connection' USING ERRCODE='22023'; END IF;
  PERFORM private.twitch_link_serial(v_actor,ident);
  SELECT * INTO req FROM private.twitch_disconnect_requests WHERE id=p_request_uuid;
  IF req.id IS NOT NULL THEN
    IF req.actor<>v_actor OR req.twitch_id<>ident THEN RAISE EXCEPTION 'Disconnect request does not match' USING ERRCODE='42501'; END IF;
    RETURN jsonb_build_object('state',req.state,'requestUuid',req.id,'identityId',req.identity_id,'expiresAt',req.expires_at);
  END IF;
  IF EXISTS(SELECT 1 FROM private.twitch_disconnect_requests r WHERE r.actor=v_actor AND r.state='prepared') THEN
    RAISE EXCEPTION 'Finish or cancel your pending Twitch disconnect first' USING ERRCODE='55000';
  END IF;
  IF (SELECT count(*) FROM private.twitch_disconnect_requests r WHERE r.actor=v_actor AND r.created_at>now()-interval '10 minutes')>=5
    OR (SELECT count(*) FROM private.twitch_disconnect_requests r WHERE r.actor=v_actor AND r.created_at>now()-interval '1 day')>=20 THEN
    RAISE EXCEPTION 'Please wait before starting another disconnect' USING ERRCODE='54000';
  END IF;
  SELECT i.id INTO identity_uuid FROM auth.identities i WHERE i.user_id=v_actor AND i.provider='twitch'
    AND private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id))=ident;
  IF identity_uuid IS NULL THEN RAISE EXCEPTION 'This Twitch identity is not connected to your sign-in' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM auth.identities i WHERE i.user_id=v_actor AND i.provider='twitch'
      AND private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id))=ident)>1
    OR (SELECT count(*) FROM public.twitch_connections c WHERE c.user_id=v_actor AND private.twitch_numeric_id(c.twitch_user_id)=ident)>1 THEN
    RAISE EXCEPTION 'This Twitch identity needs a connection review' USING ERRCODE='42501';
  END IF;
  IF (SELECT count(*) FROM auth.identities i WHERE i.user_id=v_actor)<2 THEN
    RAISE EXCEPTION 'Keep a verified email sign-in before disconnecting Twitch' USING ERRCODE='42501';
  END IF;
  SELECT * INTO conn FROM public.twitch_connections c WHERE c.user_id=v_actor AND private.twitch_numeric_id(c.twitch_user_id)=ident;
  IF conn.is_primary AND EXISTS(SELECT 1 FROM public.twitch_connections c WHERE c.user_id=v_actor AND c.confirmed AND c.id<>conn.id) THEN
    RAISE EXCEPTION 'Choose another Primary Twitch account before disconnecting this one' USING ERRCODE='23514';
  END IF;
  INSERT INTO private.twitch_disconnect_requests(id,actor,identity_id,twitch_id,connection_id)
    VALUES(p_request_uuid,v_actor,identity_uuid,ident,conn.id) RETURNING * INTO req;
  PERFORM private.account_audit_write('TWITCH_UNLINK_PREPARED',v_actor,ident,jsonb_build_object('requestUuid',req.id));
  RETURN jsonb_build_object('state',req.state,'requestUuid',req.id,'identityId',req.identity_id,'expiresAt',req.expires_at);
END;
$$;

CREATE FUNCTION public.play_finish_twitch_disconnect(p_request_uuid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=private.require_twitch_disconnect_actor(); req private.twitch_disconnect_requests;
BEGIN
  PERFORM private.twitch_link_serial(v_actor);
  SELECT * INTO req FROM private.twitch_disconnect_requests r WHERE r.id=p_request_uuid AND r.actor=v_actor FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Disconnect request not found' USING ERRCODE='42501'; END IF;
  IF req.state='completed' THEN RETURN jsonb_build_object('state','completed','requestUuid',req.id); END IF;
  IF req.state<>'prepared' THEN RAISE EXCEPTION 'Disconnect request was cancelled' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=v_actor AND i.provider='twitch'
    AND private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id))=req.twitch_id) THEN
    RETURN jsonb_build_object('state','awaitingProvider','requestUuid',req.id);
  END IF;
  -- Provider absence is observed server-side, including after an uncertain API
  -- response. An expired challenge can still reconcile this exact target safely.
  DELETE FROM public.twitch_connections c WHERE c.user_id=v_actor
    AND private.twitch_numeric_id(c.twitch_user_id)=req.twitch_id AND (req.connection_id IS NULL OR c.id=req.connection_id);
  IF EXISTS(SELECT 1 FROM public.twitch_connections c WHERE c.user_id=v_actor AND c.confirmed) THEN
    PERFORM private.sync_primary_twitch(v_actor);
  ELSE
    UPDATE public.profiles p SET twitch_user_id=NULL,twitch_login=NULL,updated_at=now()
      WHERE p.id=v_actor AND private.twitch_numeric_id(p.twitch_user_id)=req.twitch_id;
  END IF;
  UPDATE private.twitch_disconnect_requests SET state='completed',finished_at=now() WHERE id=req.id;
  PERFORM private.account_audit_write('TWITCH_UNLINKED',v_actor,req.twitch_id,
    jsonb_build_object('requestUuid',req.id,'source','verified-provider-disconnect'));
  RETURN jsonb_build_object('state','completed','requestUuid',req.id);
END;
$$;

CREATE FUNCTION public.play_cancel_twitch_disconnect(p_request_uuid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=private.require_twitch_disconnect_actor(); req private.twitch_disconnect_requests;
BEGIN
  PERFORM private.twitch_link_serial(v_actor);
  SELECT * INTO req FROM private.twitch_disconnect_requests r WHERE r.id=p_request_uuid AND r.actor=v_actor FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Disconnect request not found' USING ERRCODE='42501'; END IF;
  IF req.state<>'prepared' THEN RETURN jsonb_build_object('state',req.state,'requestUuid',req.id); END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=v_actor AND i.id=req.identity_id) THEN
    RETURN jsonb_build_object('state','needsReconciliation','requestUuid',req.id);
  END IF;
  UPDATE private.twitch_disconnect_requests SET state='cancelled',finished_at=now() WHERE id=req.id;
  PERFORM private.account_audit_write('TWITCH_UNLINK_CANCELLED',v_actor,req.twitch_id,jsonb_build_object('requestUuid',req.id));
  RETURN jsonb_build_object('state','cancelled','requestUuid',req.id);
END;
$$;

CREATE FUNCTION public.play_twitch_disconnect_state() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_actor uuid:=private.require_twitch_policy_actor(); req private.twitch_disconnect_requests;
BEGIN
  SELECT * INTO req FROM private.twitch_disconnect_requests r WHERE r.actor=v_actor AND r.state='prepared';
  IF req.id IS NULL THEN RETURN jsonb_build_object('state','none'); END IF;
  RETURN jsonb_build_object('state','prepared','requestUuid',req.id,'identityId',req.identity_id,
    'twitchId',req.twitch_id,'expiresAt',req.expires_at);
END;
$$;

-- Preserve the exact existing RPC while disabled. Its old exposed signature
-- cannot bypass provider verification once policy is enabled.
DO $$ BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.play_disconnect_twitch(text)'::regprocedure)<>'9eb6275c39191242b6789697a6e419ce' THEN
    RAISE EXCEPTION 'Disconnect source changed; review before wrapping';
  END IF;
END $$;
ALTER TABLE private.twitch_link_policy_settings ADD COLUMN disconnect_prior_acl aclitem[];
UPDATE private.twitch_link_policy_settings SET disconnect_prior_acl=(
  SELECT coalesce(proacl,acldefault('f',proowner)) FROM pg_proc WHERE oid='public.play_disconnect_twitch(text)'::regprocedure
) WHERE singleton;
ALTER FUNCTION public.play_disconnect_twitch(text) SET SCHEMA private;
ALTER FUNCTION private.play_disconnect_twitch(text) RENAME TO play_disconnect_twitch_before_policy;
REVOKE ALL ON FUNCTION private.play_disconnect_twitch_before_policy(text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.play_disconnect_twitch(p_twitch_user_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF private.twitch_link_policy_active(auth.uid()) THEN
    RAISE EXCEPTION 'Use the verified Twitch disconnect flow' USING ERRCODE='55000';
  END IF;
  RETURN private.play_disconnect_twitch_before_policy(p_twitch_user_id);
END;
$$;
REVOKE ALL ON FUNCTION private.require_twitch_disconnect_actor(),public.play_prepare_twitch_disconnect(text,uuid),
  public.play_finish_twitch_disconnect(uuid),public.play_cancel_twitch_disconnect(uuid),public.play_disconnect_twitch(text),
  public.play_twitch_disconnect_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.play_prepare_twitch_disconnect(text,uuid),public.play_finish_twitch_disconnect(uuid),
  public.play_cancel_twitch_disconnect(uuid),public.play_disconnect_twitch(text),public.play_twitch_disconnect_state() TO authenticated;
COMMIT;
