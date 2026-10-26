BEGIN;
UPDATE private.berry_drop_policy SET enabled=false WHERE singleton;
COMMIT;
