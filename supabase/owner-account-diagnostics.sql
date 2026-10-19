-- Read-only context. Auth Admin data is inspected only by the server Edge Function.
BEGIN;
CREATE OR REPLACE FUNCTION public.owner_account_diagnostics_context(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL OR private.play_staff_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user IS NULL OR private.streamlink_protected_trainer(p_user) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id=p_user AND
    lower(coalesce(username,'')) IN ('playtester','playerqa')
  ) THEN
    RAISE EXCEPTION 'Account unavailable for diagnostics' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user) THEN
    RAISE EXCEPTION 'Account unavailable for diagnostics' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('targetUuid',p_user,'passwordPresent',private.profile_has_password(p_user),
    'appConnections',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'login',twitch_login,'confirmed',confirmed,'loginEnabled',login_enabled,
      'gameplayEnabled',gameplay_enabled,'primary',is_primary,'lastVerifiedAt',last_verified_at
    ) ORDER BY id) FROM public.twitch_connections WHERE user_id=p_user),'[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.owner_account_diagnostics_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_account_diagnostics_context(uuid) TO authenticated;
COMMIT;
