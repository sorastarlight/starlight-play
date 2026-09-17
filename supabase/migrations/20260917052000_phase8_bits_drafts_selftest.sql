-- Phase 8 draft supporter packs (NOT live) and Bits self-test.

insert into private.store_items (
  sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra, status
)
select
  'bits-community',
  c.id,
  'Starlight Community Pack',
  'Honey-forward stream support: 8 Honey, 4 Oran Berries, 4 Poké Balls.',
  0, 175,
  '{"bait":8,"berry":4,"pokeball":4}'::jsonb,
  'amulet-coin.png', 'amulet-coin.png', false, 140, true,
  jsonb_build_object(
    'productKind', 'bits', 'status', 'draft',
    'bitsTitles', jsonb_build_array('starlight community pack', 'community pack', 'honey pack'),
    'detail', 'Draft. Reinforces Honey as community catch support. Not published.'
  ),
  'draft'
from private.store_categories c
where c.kind = 'bits'
on conflict (sku) do nothing;

insert into private.store_items (
  sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra, status
)
select
  'bits-evo',
  c.id,
  'Evolution Support Pack',
  'One Thunder Stone and one Leaf Stone for Pokémon you already own.',
  0, 400,
  '{"thunderstone":1,"leafstone":1}'::jsonb,
  'pack-thumb.png', 'pack-thumb.png', false, 150, true,
  jsonb_build_object(
    'productKind', 'bits', 'status', 'draft',
    'bitsTitles', jsonb_build_array('evolution support pack', 'evo pack', 'evolution pack'),
    'detail', 'Draft. Enables owned Pokémon. Does not grant Pokémon. Not published.'
  ),
  'draft'
from private.store_categories c
where c.kind = 'bits'
on conflict (sku) do nothing;

create or replace function private.phase8_bits_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  failed text := '';
  eid text;
  r jsonb;
  r2 jsonb;
  can_anon boolean;
  can_auth boolean;
  live_sku text;
  live_bits int;
  live_title text;
begin
  begin
    perform private.bits_validate_grants('{"odds":1,"pokeball":1}'::jsonb);
    failed := failed || 'odds allowed; ';
  exception when others then null;
  end;
  begin
    perform private.bits_validate_grants('{"masterball":1}'::jsonb);
    failed := failed || 'masterball allowed; ';
  exception when others then null;
  end;
  begin
    perform private.bits_validate_grants('{"shiny":1}'::jsonb);
    failed := failed || 'shiny allowed; ';
  exception when others then null;
  end;
  begin
    perform private.validate_store_grants('{"masterball":1}'::jsonb);
    failed := failed || 'validate masterball; ';
  exception when others then null;
  end;

  select p.sku, p.bits, coalesce(p.titles->>0, lower(p.name)) into live_sku, live_bits, live_title
  from private.bits_live_products() p
  order by p.bits
  limit 1;
  if live_sku is null then failed := failed || 'no live bits product; '; end if;

  eid := 'qa-self:' || replace(gen_random_uuid()::text, '-', '');
  r := public.credit_bits_from_twitch(eid, 'qa-phase8-unlinked', coalesce(live_title, 'starter pack'), coalesce(live_bits, 100), null);
  if coalesce(r->>'status', '') not in ('pending', 'unresolved') then
    failed := failed || 'unlinked not pending; ';
  end if;
  if not exists (select 1 from private.bits_pending where event_id = eid) then
    failed := failed || 'unlinked not queued; ';
  end if;
  r2 := public.credit_bits_from_twitch(eid, 'qa-phase8-unlinked', coalesce(live_title, 'starter pack'), coalesce(live_bits, 100), null);
  if coalesce(r2->>'duplicate', '') <> 'true' then
    failed := failed || 'duplicate not blocked; ';
  end if;

  eid := 'qa-self:' || replace(gen_random_uuid()::text, '-', '');
  r := public.credit_bits_from_twitch(eid, 'qa-phase8-general', 'not a store product', 17, 'qa-user');
  if coalesce(r->>'general', '') <> 'true' and coalesce(r->>'status', '') <> 'ignored' then
    failed := failed || 'unmatched not ignored; ';
  end if;
  if exists (select 1 from public.reward_events where idempotency = 'bits:' || eid) then
    failed := failed || 'unmatched granted; ';
  end if;

  eid := 'qa-self:' || replace(gen_random_uuid()::text, '-', '');
  r := public.credit_bits_from_twitch(eid, '', coalesce(live_title, 'starter pack'), coalesce(live_bits, 100), '');
  if coalesce(r->>'status', '') <> 'unresolved' then failed := failed || 'anonymous not unresolved; '; end if;
  delete from private.bits_pending where event_id = eid;
  delete from private.bits_events where event_id = eid;

  select has_function_privilege('anon', 'public.credit_bits_from_twitch(text,text,text,int,text)', 'execute') into can_anon;
  select has_function_privilege('authenticated', 'public.credit_bits_from_twitch(text,text,text,int,text)', 'execute') into can_auth;
  if can_anon or can_auth then failed := failed || 'browser can credit bits; '; end if;

  if exists (select 1 from private.bits_live_products() p where p.sku in ('bits-community', 'bits-evo')) then
    failed := failed || 'draft packs are live; ';
  end if;
  if private.bits_sku('starlight community pack', 175) is not null then
    failed := failed || 'draft title matched live; ';
  end if;

  delete from private.bits_pending where event_id like 'qa-self:%';
  delete from private.bits_events where event_id like 'qa-self:%';

  if failed <> '' then
    return jsonb_build_object('ok', false, 'failed', failed);
  end if;
  return jsonb_build_object('ok', true, 'liveProduct', live_sku, 'draftsHidden', true);
end;
$function$;

do $$
declare
  result jsonb;
begin
  result := private.phase8_bits_selftest();
  if not coalesce((result->>'ok')::boolean, false) then
    raise exception 'phase8 bits selftest failed: %', result->>'failed';
  end if;
end;
$$;
