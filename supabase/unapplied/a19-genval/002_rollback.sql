-- A19-GENVAL UNAPPLIED ROLLBACK (issue #25)
-- DO NOT RUN against live Supabase or any connected project.
-- Drops GENVAL functions/helpers only. Does not touch ref_*, catches, or stamp_catch_row.

BEGIN;

DROP FUNCTION IF EXISTS private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS private.assert_streamlink_legal(jsonb, text);
DROP FUNCTION IF EXISTS private.streamlink_level_up_slice(text, integer, integer);
DROP FUNCTION IF EXISTS private.streamlink_hp_max(integer, integer, integer, integer);
DROP FUNCTION IF EXISTS private.streamlink_stat(integer, integer, integer, integer, numeric);
DROP FUNCTION IF EXISTS private.streamlink_gender(integer, bigint);
DROP FUNCTION IF EXISTS private.streamlink_obtain_ok(text, text, integer);
DROP FUNCTION IF EXISTS private.streamlink_form_blocked(text, integer);
DROP FUNCTION IF EXISTS private.streamlink_seed_rejected(text);
DROP FUNCTION IF EXISTS private.streamlink_hidden_ticket_ok(text, text, integer, text);
DROP FUNCTION IF EXISTS private.streamlink_roll_u32(text, text);
DROP FUNCTION IF EXISTS private.streamlink_fixture_u32(text, text);
DROP TABLE IF EXISTS private.streamlink_hidden_tickets;

COMMIT;
