BEGIN;DO $guard$ BEGIN
IF md5(pg_get_functiondef('private.pass_period_start(text,timestamp with time zone)'::regprocedure))<>'b9b1890636b517b26f4ab799f3c1cbab' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('private.record_pass_verification()'::regprocedure))<>'1f30e81762d7f8b35f7fee7c9a157743' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('private.materialize_pass_crates(uuid)'::regprocedure))<>'dc2036e60ff03257d1ea481540157b89' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pass_period_wallet(uuid)'::regprocedure))<>'d2f7f1de0edeece5557cae1b2d29b26e' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('play_open_pass_crate(uuid)'::regprocedure))<>'d62edcb75b09b6ce745e4a18513c3937' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_item_location(text)'::regprocedure))<>'7237bb7dfbeb6b1a020cce948abe7126' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_items()'::regprocedure))<>'4666cfa23eb92a848e66cfc003ff594c' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('play_store()'::regprocedure))<>'127fa7a644860ffbf45f61edcd0bd844' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
IF md5(pg_get_functiondef('play_claim_pass(text)'::regprocedure))<>'c560ef01e9c864c1df34c54408386192' THEN RAISE EXCEPTION 'PASS_STOP_DRIFT';END IF;
END $guard$;ALTER TABLE public.profiles DISABLE TRIGGER pass_verified_period;CREATE OR REPLACE FUNCTION private.materialize_pass_crates(p_uid uuid) RETURNS integer LANGUAGE plpgsql SET search_path='' AS $body$ BEGIN RETURN 0;END;$body$;CREATE OR REPLACE FUNCTION public.play_claim_pass(p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$ BEGIN RAISE EXCEPTION 'Pass supplies are temporarily paused. Your earned rewards are safe.';END;$body$;COMMIT;