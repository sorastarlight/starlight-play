BEGIN;
DO $guard$ BEGIN
IF md5(pg_get_functiondef('private.hub_trainer_style(text)'::regprocedure)) IS DISTINCT FROM '2811893dd4ad85ce85d21d5c55fff533' THEN RAISE EXCEPTION 'Trainer style rollback drift';END IF;
IF md5(pg_get_functiondef('admin_trainer_styles_read()'::regprocedure)) IS DISTINCT FROM '61043b9777d492ae9df29003d65acfa5' THEN RAISE EXCEPTION 'Trainer style rollback drift';END IF;
IF md5(pg_get_functiondef('admin_trainer_style_save(jsonb)'::regprocedure)) IS DISTINCT FROM '3351c875e0d003bbdbb186c7076efd37' THEN RAISE EXCEPTION 'Trainer style rollback drift';END IF;
END $guard$;
REVOKE ALL ON FUNCTION public.admin_trainer_styles_read(),public.admin_trainer_style_save(jsonb),private.hub_trainer_style(text) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
