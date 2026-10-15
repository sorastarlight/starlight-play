-- A19-WIRE local teardown. Disposable clusters only.
-- Does not touch GENVAL generate/assert, ref_*, or production stamp_catch_row.

DROP TRIGGER IF EXISTS streamlink_test_after_catch_inject ON public.catches;
DROP FUNCTION IF EXISTS private.streamlink_test_after_catch_inject();
DROP FUNCTION IF EXISTS private.streamlink_after_materialize_hook();
DROP FUNCTION IF EXISTS private.materialize_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text);
DROP FUNCTION IF EXISTS private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text);
DROP FUNCTION IF EXISTS private.streamlink_complete_specimen_bound(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint, uuid);
DROP FUNCTION IF EXISTS private.streamlink_complete_and_bind(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint, uuid);
DROP FUNCTION IF EXISTS private.streamlink_next_public_id(text);
DROP FUNCTION IF EXISTS private.streamlink_protected_trainer(uuid);
DROP FUNCTION IF EXISTS private.streamlink_wire_set_enabled(boolean);
DROP FUNCTION IF EXISTS private.streamlink_wire_is_enabled();
DROP TABLE IF EXISTS private.streamlink_wire_switch;
