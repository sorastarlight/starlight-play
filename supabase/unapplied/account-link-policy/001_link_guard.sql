-- Issue17 local implementation. UNAPPLIED; not a migration or production GO.
-- Starts disabled. Existing links are preserved; never auto-unlinks Auth identities.
BEGIN;
CREATE TABLE private.twitch_link_policy_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false,
  qa_user uuid
);
INSERT INTO private.twitch_link_policy_settings(singleton) VALUES(true);
CREATE TABLE private.twitch_link_mutex (
  key text PRIMARY KEY, revision bigint NOT NULL DEFAULT 1
);
CREATE TABLE private.twitch_link_exceptions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  enabled boolean NOT NULL DEFAULT true,
  max_links integer NOT NULL CHECK(max_links BETWEEN 2 AND 10),
  purpose text NOT NULL CHECK(length(btrim(purpose)) BETWEEN 3 AND 240),
  approved_by uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.twitch_link_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.twitch_link_mutex ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.twitch_link_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.twitch_link_policy_settings,private.twitch_link_mutex,private.twitch_link_exceptions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.twitch_link_policy_active(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT p_user IS NOT NULL AND coalesce((SELECT s.enabled AND (s.qa_user IS NULL OR s.qa_user=p_user)
    FROM private.twitch_link_policy_settings s WHERE s.singleton),false);
$$;

CREATE FUNCTION private.twitch_numeric_id(p_id text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
  SELECT CASE WHEN btrim(coalesce(p_id,'')) ~ '^(miu:)?[0-9]+$'
    THEN coalesce(nullif(ltrim(regexp_replace(btrim(p_id),'^miu:',''),'0'),''),'0') END;
$$;
CREATE INDEX twitch_connections_numeric_id_idx ON public.twitch_connections(private.twitch_numeric_id(twitch_user_id));

CREATE FUNCTION private.twitch_link_limit(p_user uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce((SELECT e.max_links FROM private.twitch_link_exceptions e
    WHERE e.user_id=p_user AND e.enabled AND private.play_staff_role(p_user) IN ('owner','moderator')),1);
$$;

CREATE FUNCTION private.twitch_link_serial(p_user uuid,p_id text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  -- A written mutex row makes REPEATABLE READ races fail with serialization
  -- errors instead of allowing a count from a stale snapshot after a lock wait.
  INSERT INTO private.twitch_link_mutex(key) VALUES('user:'||p_user::text)
    ON CONFLICT(key) DO UPDATE SET revision=private.twitch_link_mutex.revision+1;
  IF p_id IS NOT NULL THEN
    INSERT INTO private.twitch_link_mutex(key) VALUES('identity:'||p_id)
      ON CONFLICT(key) DO UPDATE SET revision=private.twitch_link_mutex.revision+1;
  END IF;
END;
$$;

CREATE FUNCTION private.twitch_link_slots(p_user uuid) RETURNS TABLE(identity text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce(private.twitch_numeric_id(c.twitch_user_id),'legacy:'||c.twitch_user_id)
    FROM public.twitch_connections c WHERE c.user_id=p_user
  UNION
  SELECT coalesce(private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id)),
    'legacy:'||coalesce(i.identity_data->>'sub',i.provider_id))
    FROM auth.identities i WHERE i.user_id=p_user AND i.provider='twitch';
$$;

CREATE FUNCTION private.guard_twitch_link_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE ident text; raw_ident text; slots integer; cap integer;
BEGIN
  IF NOT private.twitch_link_policy_active(NEW.user_id) THEN RETURN NEW; END IF;
  IF TG_TABLE_SCHEMA='auth' THEN
    IF TG_OP='UPDATE' AND (OLD.provider='twitch' OR NEW.provider='twitch') AND
       (NEW.provider IS DISTINCT FROM OLD.provider OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
         OR private.twitch_numeric_id(coalesce(nullif(btrim(NEW.identity_data->>'sub'),''),NEW.provider_id)) IS DISTINCT FROM
            private.twitch_numeric_id(coalesce(nullif(btrim(OLD.identity_data->>'sub'),''),OLD.provider_id))) THEN
      RAISE EXCEPTION 'Identity transfers require a separate recovery review' USING ERRCODE='42501';
    END IF;
    IF NEW.provider<>'twitch' THEN RETURN NEW; END IF;
    raw_ident:=coalesce(nullif(btrim(NEW.identity_data->>'sub'),''),NEW.provider_id);
    ident:=private.twitch_numeric_id(raw_ident);
    IF ident IS DISTINCT FROM private.twitch_numeric_id(NEW.provider_id) THEN
      RAISE EXCEPTION 'Twitch provider identity did not match' USING ERRCODE='22023';
    END IF;
    -- Metadata refresh of the same identity is not a new link.
    IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
  ELSE
    IF TG_OP='UPDATE' THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.twitch_user_id IS DISTINCT FROM OLD.twitch_user_id THEN
        RAISE EXCEPTION 'Identity transfers require a separate recovery review' USING ERRCODE='42501';
      END IF;
      -- Existing confirmed links survive demotion/revocation; no forced unlink.
      IF OLD.confirmed OR NOT NEW.confirmed THEN RETURN NEW; END IF;
    END IF;
    raw_ident:=NEW.twitch_user_id;
    ident:=private.twitch_numeric_id(raw_ident);
  END IF;
  IF ident IS NULL OR ident='0' THEN RAISE EXCEPTION 'A verified Twitch identity is required' USING ERRCODE='22023'; END IF;
  PERFORM private.twitch_link_serial(NEW.user_id,ident);
  -- Serialize an effective staff-role removal against using its exception.
  PERFORM 1 FROM public.staff_roles r WHERE r.user_id=NEW.user_id FOR SHARE;
  IF EXISTS(SELECT 1 FROM public.twitch_connections c WHERE c.user_id=NEW.user_id
      AND private.twitch_numeric_id(c.twitch_user_id)=ident AND c.twitch_user_id<>raw_ident) THEN
    RAISE EXCEPTION 'This Twitch identity needs a connection review' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.twitch_connections c WHERE c.user_id<>NEW.user_id
      AND private.twitch_numeric_id(c.twitch_user_id)=ident)
    OR EXISTS(SELECT 1 FROM auth.identities i WHERE i.provider='twitch' AND i.user_id<>NEW.user_id
      AND private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id))=ident) THEN
    RAISE EXCEPTION 'This Twitch identity cannot be linked to this Trainer' USING ERRCODE='42501';
  END IF;
  IF TG_TABLE_SCHEMA<>'auth' AND NOT EXISTS(SELECT 1 FROM auth.identities i
    WHERE i.user_id=NEW.user_id AND i.provider='twitch'
      AND private.twitch_numeric_id(coalesce(nullif(btrim(i.identity_data->>'sub'),''),i.provider_id))=ident) THEN
    RAISE EXCEPTION 'Complete Twitch verification before linking' USING ERRCODE='42501';
  END IF;
  cap:=private.twitch_link_limit(NEW.user_id);
  SELECT count(*) INTO slots FROM private.twitch_link_slots(NEW.user_id) s WHERE s.identity<>ident;
  IF slots>=cap THEN
    RAISE EXCEPTION 'Your Trainer has reached its Twitch account limit. Reauthorize the existing account or contact Support.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER twitch_link_identity_guard BEFORE INSERT OR UPDATE ON auth.identities
  FOR EACH ROW EXECUTE FUNCTION private.guard_twitch_link_identity();
CREATE TRIGGER twitch_link_connection_guard BEFORE INSERT OR UPDATE ON public.twitch_connections
  FOR EACH ROW EXECUTE FUNCTION private.guard_twitch_link_identity();

CREATE FUNCTION private.require_twitch_policy_actor() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); sid uuid;
BEGIN
  BEGIN sid:=(auth.jwt()->>'session_id')::uuid; EXCEPTION WHEN invalid_text_representation THEN sid:=NULL; END;
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
    WHERE s.id=sid AND s.user_id=actor AND (s.not_after IS NULL OR s.not_after>now())
      AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN
    RAISE EXCEPTION 'Sign in again to manage Twitch connections' USING ERRCODE='42501';
  END IF;
  RETURN actor;
END;
$$;

CREATE FUNCTION public.play_twitch_link_policy() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=private.require_twitch_policy_actor(); n integer; cap integer;
BEGIN
  SELECT count(*) INTO n FROM private.twitch_link_slots(actor);
  cap:=private.twitch_link_limit(actor);
  RETURN jsonb_build_object('enabled',private.twitch_link_policy_active(actor),
    'limit',cap,'used',n,'canAdd',n<cap,'needsReview',n>cap);
END;
$$;

CREATE FUNCTION public.owner_twitch_link_exception(p_target uuid,p_enabled boolean,p_max_links integer,
  p_purpose text,p_reason text,p_case_ref text,p_expected_revision bigint DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=private.require_twitch_policy_actor(); old_revision bigint; next_revision bigint;
BEGIN
  PERFORM private.require_recent_recovery_owner();
  IF p_target IS NULL OR p_enabled IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
    OR p_max_links IS NULL OR p_max_links NOT BETWEEN 2 AND 10
    OR length(btrim(coalesce(p_purpose,''))) NOT BETWEEN 3 AND 240
    OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500
    OR length(btrim(coalesce(p_case_ref,''))) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Provide the exception purpose, reason and case reference' USING ERRCODE='22023';
  END IF;
  IF private.streamlink_protected_trainer(p_target) THEN
    RAISE EXCEPTION 'Protected Trainer changes require separate authorization' USING ERRCODE='42501';
  END IF;
  PERFORM private.twitch_link_serial(p_target);
  PERFORM 1 FROM public.staff_roles r WHERE r.user_id=p_target FOR SHARE;
  IF p_enabled AND private.play_staff_role(p_target) IS DISTINCT FROM 'owner'
     AND private.play_staff_role(p_target) IS DISTINCT FROM 'moderator' THEN
    RAISE EXCEPTION 'Only eligible staff may receive a Twitch link exception' USING ERRCODE='42501';
  END IF;
  SELECT revision INTO old_revision FROM private.twitch_link_exceptions WHERE user_id=p_target;
  IF coalesce(old_revision,0)<>p_expected_revision THEN
    RAISE EXCEPTION 'This exception changed; refresh before confirming' USING ERRCODE='40001';
  END IF;
  INSERT INTO private.twitch_link_exceptions(user_id,enabled,max_links,purpose,approved_by)
    VALUES(p_target,p_enabled,p_max_links,btrim(p_purpose),actor)
    ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,max_links=excluded.max_links,
      purpose=excluded.purpose,approved_by=excluded.approved_by,
      revision=private.twitch_link_exceptions.revision+1,updated_at=now()
    RETURNING revision INTO next_revision;
  PERFORM private.account_audit_write('TWITCH_LINK_EXCEPTION',p_target,NULL,
    jsonb_build_object('enabled',p_enabled,'maxLinks',p_max_links,'purpose',btrim(p_purpose),
      'reason',btrim(p_reason),'caseRef',btrim(p_case_ref),'revision',next_revision));
  RETURN jsonb_build_object('ok',true,'revision',next_revision);
END;
$$;

REVOKE ALL ON FUNCTION private.twitch_link_policy_active(uuid),private.twitch_numeric_id(text),private.twitch_link_limit(uuid),private.twitch_link_serial(uuid,text),
  private.twitch_link_slots(uuid),private.guard_twitch_link_identity(),private.require_twitch_policy_actor(),
  public.play_twitch_link_policy(),public.owner_twitch_link_exception(uuid,boolean,integer,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.play_twitch_link_policy(),
  public.owner_twitch_link_exception(uuid,boolean,integer,text,text,text,bigint) TO authenticated;
COMMIT;
