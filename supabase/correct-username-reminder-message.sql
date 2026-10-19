-- Approved recovery foundation: correct the legacy reminder response; no mail/account action.
BEGIN;
DO $check$
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.play_request_username_reminder(text)'::regprocedure) <> 'af23f54ad37bf89e3c5c242660ee64bb' THEN
  RAISE EXCEPTION 'username reminder prerequisite drifted';
 END IF;
END $check$;
DO $patch$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.play_request_username_reminder(text)'::regprocedure) INTO definition;
 definition := replace(definition, 'If an account exists for that email address, we sent recovery mail. After you sign in, your Trainer username is on My Account.', 'Username reminder emails are not available. Sign in with your email address and password, or use your linked Twitch account. Your username is on My Account.');
 EXECUTE definition;
END $patch$;
COMMIT;
