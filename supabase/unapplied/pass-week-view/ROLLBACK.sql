BEGIN;DO $guard$ BEGIN IF md5(pg_get_functiondef('private.pass_period_wallet(uuid)'::regprocedure))<>'a7aad9c4a03671154acbc8ee88203dd8' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pass_period_wallet(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_WEEK_SOURCE_DRIFT'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION private.pass_period_wallet(p_uid uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT jsonb_build_object('calendar','UTC','dailyReady',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp()) AND state='available'),
 'weeklyReady',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp()) AND state='available'),
 'passDailyNextAt',private.pass_period_start('daily',statement_timestamp())+interval '24 hours','passWeeklyNextAt',private.pass_period_start('weekly',statement_timestamp())+interval '168 hours',
 'passDailyVerified',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp())),
 'passWeeklyVerified',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp())),
 'passDailyDelivered',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp()) AND state='claimed'),
 'passWeeklyDelivered',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp()) AND state='claimed'));
$function$
;COMMIT;