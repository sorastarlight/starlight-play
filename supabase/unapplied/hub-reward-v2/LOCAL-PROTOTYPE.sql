-- LOCAL ONLY. Incomplete delivery integration; not a production install packet.
-- Catalog is private. Future staff read endpoints must authorize on the server.
create table private.hub_reward_catalog (
 id text primary key, kind text not null check(kind in ('item','candy','pokemon','coins','space')),
 name text not null, sprite text not null, enabled boolean not null default false,
 max_quantity integer not null check(max_quantity>0),
 shop_allowed boolean not null default false, pass_allowed boolean not null default false,
 staff_allowed boolean not null default false
);
alter table private.hub_reward_catalog enable row level security;
revoke all on private.hub_reward_catalog from public;
create function private.hub_validate_rewards(p_bundle jsonb,p_context text) returns jsonb
language plpgsql stable set search_path='' as $$
declare entry jsonb; item private.hub_reward_catalog; qty numeric; lvl numeric;
begin
 if p_context is null or p_context not in ('shop','pass','staff') then raise exception 'Unknown reward use.'; end if;
 if p_bundle is null or jsonb_typeof(p_bundle)<>'object' or p_bundle->'version' is distinct from '2'::jsonb or
 (select count(*) from jsonb_object_keys(p_bundle))<>2 or jsonb_typeof(p_bundle->'rewards') is distinct from 'array' then
 raise exception 'Invalid reward bundle.'; end if;
 if jsonb_array_length(p_bundle->'rewards') not between 1 and 100 then raise exception 'Choose between 1 and 100 rewards.'; end if;
 for entry in select value from jsonb_array_elements(p_bundle->'rewards') loop
  if jsonb_typeof(entry)<>'object' then raise exception 'Invalid reward.'; end if;
  if exists(select 1 from jsonb_object_keys(entry) k where k not in ('catalogId','quantity','secret','level','shiny')) then raise exception 'Unknown reward option.'; end if;
  if jsonb_typeof(entry->'catalogId') is distinct from 'string' or jsonb_typeof(entry->'quantity') is distinct from 'number' or jsonb_typeof(entry->'secret') is distinct from 'boolean' then raise exception 'Invalid reward details.'; end if;
  select * into item from private.hub_reward_catalog where id=entry->>'catalogId';
  if not found or item.enabled is not true then raise exception 'Reward unavailable.'; end if;
  if (p_context='shop' and (item.shop_allowed is not true or item.id='item:masterball')) or
     (p_context='pass' and item.pass_allowed is not true) or
     (p_context='staff' and item.staff_allowed is not true) then raise exception 'Reward unavailable for this use.'; end if;
  qty:=(entry->>'quantity')::numeric;
  if qty<>trunc(qty) or qty<1 or qty>item.max_quantity then raise exception 'Invalid reward quantity.'; end if;
  if item.kind='pokemon' then
   if jsonb_typeof(entry->'level') is distinct from 'number' or jsonb_typeof(entry->'shiny') is distinct from 'boolean' then raise exception 'Invalid Pokemon options.'; end if;
   lvl:=(entry->>'level')::numeric;
   if lvl<>trunc(lvl) or lvl<1 or lvl>100 then raise exception 'Invalid Pokemon level.'; end if;
  elsif entry ? 'level' or entry ? 'shiny' then raise exception 'Only Pokemon have level and appearance options.';
  end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_bundle->'rewards') e join private.hub_reward_catalog c on c.id=e->>'catalogId' group by c.id,c.max_quantity having sum((e->>'quantity')::numeric)>c.max_quantity) then raise exception 'Combined quantity exceeds this reward limit.'; end if;
 if (select coalesce(sum((e->>'quantity')::numeric),0) from jsonb_array_elements(p_bundle->'rewards') e join private.hub_reward_catalog c on c.id=e->>'catalogId' where c.kind='pokemon')>100 then raise exception 'A bundle can contain at most 100 Pokemon.'; end if;
 return p_bundle;
end;
$$;
revoke all on function private.hub_validate_rewards(jsonb,text) from public;
create function private.hub_player_reward_preview(p_bundle jsonb,p_context text) returns jsonb
language plpgsql stable set search_path='' as $$
declare entry jsonb; item private.hub_reward_catalog; result jsonb:='[]';
begin
 perform private.hub_validate_rewards(p_bundle,p_context);
 for entry in select value from jsonb_array_elements(p_bundle->'rewards') loop
  if (entry->>'secret')::boolean then
   result:=result||jsonb_build_array(jsonb_build_object('name','Secret Gift','sprite','images/items/secret-gift.svg','secret',true));
  else
   select * into item from private.hub_reward_catalog where id=entry->>'catalogId';
   result:=result||jsonb_build_array(jsonb_build_object('name',item.name,'sprite',item.sprite,'quantity',entry->'quantity','secret',false)||case when item.kind='pokemon' then jsonb_build_object('level',entry->'level','shiny',entry->'shiny') else '{}'::jsonb end);
  end if;
 end loop;
 return result;
end;
$$;
revoke all on function private.hub_player_reward_preview(jsonb,text) from public;
