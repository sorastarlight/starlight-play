BEGIN;SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN IF md5(pg_get_functiondef('private.pass_period_wallet(uuid)'::regprocedure))<>'d2f7f1de0edeece5557cae1b2d29b26e' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pass_period_wallet(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_WEEK_SOURCE_DRIFT'; END IF; END $guard$;
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
 'passWeeklyDelivered',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp()) AND state='claimed'), 'passDays',(SELECT jsonb_agg(jsonb_build_object('start',s,'today',s=private.pass_period_start('daily',statement_timestamp()),'state',CASE
 WHEN r.state IN ('claimed','opened') THEN 'claimed'
 WHEN s>private.pass_period_start('daily',statement_timestamp()) THEN 'upcoming'
 WHEN r.state IN ('crated','available') AND s<private.pass_period_start('daily',statement_timestamp()) THEN 'missed'
 WHEN r.state='available' THEN 'ready' ELSE 'unverified' END) ORDER BY s)
 FROM generate_series(0,6) AS days(n)
 CROSS JOIN LATERAL (SELECT private.pass_period_start('weekly',statement_timestamp())+days.n*interval '24 hours' AS s) dates
 LEFT JOIN private.pass_period_rewards r ON r.user_id=p_uid AND r.kind='daily' AND r.period_start=s)
);
$function$
;
COMMIT;