# Launch table access review

October 21, 2026. Read-only hosted catalog review of project dtflmlbjhttoewqgkujf while awaiting owner access for the approved Metapod gift.

All 63 public base tables have row-level security enabled. The single public view, species_mastery_progress, uses security_invoker=true; authenticated SELECT is granted and anonymous SELECT is denied. Neither anon nor authenticated can CREATE objects in public.

Public table policies are read-only except site_config's UPDATE policy. That policy applies private.is_play_admin() to both USING and WITH CHECK. The helper checks private.play_staff_role(auth.uid()). The role helper uses confirmed Twitch connections or Twitch auth identities matching broadcaster configuration, then staff_roles; it returns null for a null caller. It does not use raw_user_meta_data. Provider-link integrity and other callable routines still require their own review; this does not establish all role-assignment paths are safe.

Many historical tables retain INSERT/UPDATE/DELETE grants, but the inspected RLS policies do not permit those operations to ordinary trainers. Grant presence alone therefore does not establish a direct-write vulnerability. Tables with RLS and no policy default to denying browser row access; those notices should not be fixed by adding permissive policies.

This is catalog evidence, not an authenticated adversarial write test or a complete security sign-off. No grants, policies, schema, roles, configuration or player data changed. Mutable search paths and privileged RPC authorization still require function-by-function review. No blanket changes were made to suppress advisor counts.
