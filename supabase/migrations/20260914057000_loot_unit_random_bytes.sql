-- loot_unit() called gen_random_bytes without the extensions schema,
-- so encounter settle failed and Play showed the raw SQL error.

create or replace function private.loot_unit()
returns numeric
language sql
volatile
as $function$
  select (('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint::numeric + 0.5) / 4294967296.0;
$function$;
