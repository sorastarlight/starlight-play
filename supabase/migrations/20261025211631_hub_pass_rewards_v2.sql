do $guard$ begin
if md5(pg_get_functiondef('private.persist_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure)) is distinct from '9266f4b080ff9e661d5305c0943af257' then raise exception 'Source drift: canonical generator';end if;
if md5(pg_get_functiondef('public.admin_save_pass_rewards(jsonb,jsonb)'::regprocedure)) is distinct from 'efedde0cb490951ffad9115c0211f03d' then raise exception 'Source drift: admin_save_pass_rewards';end if;
if md5(pg_get_functiondef('public.play_claim_pass(text)'::regprocedure)) is distinct from 'be665de34438b3055441f5ead2594dc4' then raise exception 'Source drift: play_claim_pass';end if;
if md5(pg_get_functiondef('public.play_store()'::regprocedure)) is distinct from 'f0f435743b076e8356a67f58c01f0e56' then raise exception 'Source drift: play_store';end if;
if md5(pg_get_functiondef('public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text)'::regprocedure)) is distinct from '7e58b6d5f7cb647e5f414d53ccb27d87' then raise exception 'Source drift: admin_trainer_reward_action';end if;
if to_regclass('private.hub_pass_settings') is not null then raise exception 'Pass migration conflicts.';end if;end $guard$;
-- Expanded Pass bundles. Private definitions, atomic receipts, exact legacy conversion.
create view private.hub_reward_catalog with (security_invoker=true) as
with core(id,kind,name,sprite,category,target_key) as (values
 ('item:berry','item','Berry','images/items/oran-berry.png','Berries','berry'),
 ('item:bait','item','Honey','images/items/honey.png','Capture tools','bait'),
 ('item:pokeball','item','Poké Ball','images/items/poke-ball.png','Poké Balls','pokeball'),
 ('item:greatball','item','Great Ball','images/items/great-ball.png','Poké Balls','greatball'),
 ('item:ultraball','item','Ultra Ball','images/items/ultra-ball.png','Poké Balls','ultraball'),
 ('item:lure','item','Poké Radar','images/items/poke-radar.png','Capture tools','lure'),
 ('coins','coins','PokéCoins','images/items/pokecoin.png','Currency','coins'),
 ('space','space','Inventory Space','images/items/inventory-bag.png','Capacity','bag_bonus'),
 ('item:firestone','item','Fire Stone','images/items/fire-stone.png','Evolution items','firestone'),
 ('item:waterstone','item','Water Stone','images/items/water-stone.png','Evolution items','waterstone'),
 ('item:thunderstone','item','Thunder Stone','images/items/thunder-stone.png','Evolution items','thunderstone'),
 ('item:leafstone','item','Leaf Stone','images/items/leaf-stone.png','Evolution items','leafstone'),
 ('item:moonstone','item','Moon Stone','images/items/moon-stone.png','Evolution items','moonstone'),
 ('item:linkingcord','item','Linking Cord','images/items/linking-cord.png','Evolution items','linkingcord'),
 ('item:rarecandy','item','Rare Candy','images/items/rare-candy.png','Evolution items','rarecandy')
), all_rows as (
 select *,null::int target_number,true enabled from core
 union all select 'item:'||b.key,'item',b.name,case when b.image like 'images/%' then b.image else 'images/items/'||b.image end,'Poké Balls',b.key,null,b.enabled from public.capture_balls b where not exists(select 1 from core where target_key=b.key)
 union all select 'item:'||b.key,'item',b.name,case when b.sprite like 'images/%' then b.sprite else 'images/items/'||b.sprite end,'Berries',b.key,null,b.enabled from public.capture_berries b where not exists(select 1 from core where target_key=b.key)
 union all select 'item:'||p.item_slug,'item',c.display_name,c.sprite_path,'Other items',p.item_slug,null,p.inventory_enabled and (p.admin_grant_enabled or p.mart_buy_enabled) from public.item_policy p join public.item_catalog c on c.slug=p.item_slug where p.inventory_enabled and not exists(select 1 from core where target_key=p.item_slug) and not exists(select 1 from public.capture_balls b where b.key=p.item_slug) and not exists(select 1 from public.capture_berries b where b.key=p.item_slug)
 union all select 'candy:'||f.id,'candy',f.name||' Evolution Candy','images/items/evolution-candy/'||f.id||'.png','Evolution Candy',null,f.id,true from public.evolution_families f where f.id in (select distinct coalesce(nullif(s.family_candy_species_id,0),s.family_id,s.dex) from public.species s where s.dex between 1 and 151)
 union all select 'pokemon:'||s.dex,'pokemon',s.name,'images/pokemon/home/'||s.dex||'.png','Pokémon',null,s.dex,true from public.species s where s.dex between 1 and 151
)
select id,kind,coalesce(name,initcap(id)) name,case when sprite ~ '^images/[a-zA-Z0-9_./-]+[.](png|webp|svg)$' and sprite not like '%..%' then sprite else 'images/items/secret-gift.svg' end sprite,category,target_key,target_number,coalesce(enabled,false) enabled,case when kind='pokemon' then 100 else 10000 end max_quantity,id<>'item:masterball' shop_allowed,true pass_allowed,true staff_allowed from all_rows;
revoke all on private.hub_reward_catalog from public,anon,authenticated;
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

create table private.hub_pass_settings(id boolean primary key default true check(id),daily jsonb not null,weekly jsonb not null,revision bigint not null default 1,updated_by uuid,updated_at timestamptz not null default now());
create table private.hub_pass_settings_history(id bigint generated always as identity primary key,actor_id uuid,request_id uuid unique,before_value jsonb not null,after_value jsonb not null,after_revision bigint not null,created_at timestamptz not null default now());
create table private.hub_reward_deliveries(idempotency text primary key,actor_id uuid not null,target_id uuid not null,bundle jsonb not null,status text not null check(status in ('pending','delivered')),result jsonb,created_at timestamptz not null default now());
alter table private.hub_pass_settings enable row level security;
alter table private.hub_pass_settings_history enable row level security;
alter table private.hub_reward_deliveries enable row level security;
revoke all on private.hub_pass_settings,private.hub_pass_settings_history,private.hub_reward_deliveries from public,anon,authenticated;

create function private.hub_convert_pass(p_old jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;begin
 select jsonb_build_object('version',2,'rewards',jsonb_agg(jsonb_build_object('catalogId',case e.key when 'coins' then 'coins' when 'bag_bonus' then 'space' else 'item:'||e.key end,'quantity',e.value,'secret',false) order by e.key)) into result from jsonb_each(p_old) e;
 return private.hub_validate_rewards(result,'pass');end $$;
revoke all on function private.hub_convert_pass(jsonb) from public;
insert into private.hub_pass_settings(id,daily,weekly) values(true,private.hub_convert_pass(private.pass_reward_grants('daily')),private.hub_convert_pass(private.pass_reward_grants('weekly')));
insert into private.hub_pass_settings_history(actor_id,before_value,after_value,after_revision) select null,jsonb_build_object('daily',private.pass_reward_grants('daily'),'weekly',private.pass_reward_grants('weekly')),jsonb_build_object('daily',daily,'weekly',weekly),revision from private.hub_pass_settings;

create function public.admin_pass_rewards_read() returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.require_staff_edit();return (select jsonb_build_object('revision',revision::text,'daily',daily->'rewards','weekly',weekly->'rewards','catalog',(select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'sprite',sprite,'category',category,'enabled',enabled,'maxQuantity',max_quantity) order by category,name) from private.hub_reward_catalog)) from private.hub_pass_settings where id);end $$;
revoke all on function public.admin_pass_rewards_read() from public,anon;
grant execute on function public.admin_pass_rewards_read() to authenticated;

create function public.admin_pass_rewards_save(p_request uuid,p_revision text,p_daily jsonb,p_weekly jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old private.hub_pass_settings;prior private.hub_pass_settings_history;v_after jsonb;begin
 perform private.require_staff_edit();if auth.uid() is null or p_request is null then raise exception 'Sign in and reload rewards.' using errcode='42501';end if;
 select * into old from private.hub_pass_settings where id for update;
 select * into prior from private.hub_pass_settings_history where request_id=p_request;
 v_after:=jsonb_build_object('daily',private.hub_validate_rewards(p_daily,'pass'),'weekly',private.hub_validate_rewards(p_weekly,'pass'));
 if found then if prior.actor_id is distinct from auth.uid() or prior.after_value is distinct from v_after then raise exception 'Request does not match the saved changes.';end if;return jsonb_build_object('status','saved','requestId',p_request,'revision',prior.after_revision::text,'replayed',true);end if;
 if p_revision is distinct from old.revision::text then raise exception 'Rewards changed. Reload before saving.' using errcode='40001';end if;
 insert into private.hub_pass_settings_history(actor_id,request_id,before_value,after_value,after_revision) values(auth.uid(),p_request,jsonb_build_object('daily',old.daily,'weekly',old.weekly),v_after,old.revision+1);
 update private.hub_pass_settings set daily=p_daily,weekly=p_weekly,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id;
 return jsonb_build_object('status','saved','requestId',p_request,'revision',(old.revision+1)::text);end $$;
revoke all on function public.admin_pass_rewards_save(uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.admin_pass_rewards_save(uuid,text,jsonb,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION private.persist_pass_reward(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$

DECLARE

  catch_id uuid;

  prep jsonb;

  mon jsonb;

  legal jsonb;

  ticket_uuid uuid;

  v_name text;

  v_variant text;

  v_public text;

  legacy text[];

  inserted uuid;

BEGIN

  IF p_ctx IS DISTINCT FROM 'grant' OR NOT EXISTS(
    SELECT 1 FROM private.hub_reward_deliveries d WHERE d.target_id=p_user_id AND d.actor_id=auth.uid()
      AND d.status='pending' AND p_source_key LIKE 'grant:pass:'||d.idempotency||':%'
  ) THEN RAISE EXCEPTION 'An authorized pending Pass delivery is required.' USING ERRCODE='42501'; END IF;
  IF p_user_id IS NULL THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-user'));

  END IF;

  IF p_ctx IS NULL OR p_ctx NOT IN ('catch', 'grant', 'event') THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'));

  END IF;

  IF p_source_key IS NULL OR btrim(p_source_key) = '' THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-source-key'));

  END IF;

  IF p_ctx = 'catch' AND p_source_key NOT LIKE 'play:%' THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));

  END IF;

  IF p_ctx = 'grant' AND p_source_key NOT LIKE 'grant:%' THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));

  END IF;

  IF p_ctx = 'event' AND p_source_key NOT LIKE 'event:%' THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));

  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id AND private.streamlink_protected_trainer(p_user_id) THEN

    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('protected-trainer'));

  END IF;



  catch_id := gen_random_uuid();

  prep := private.streamlink_generate_prepare(

    p_form_id, p_level, p_ctx, coalesce(p_content_build, 'sl-ref-20261013-227b573'), p_hidden_ticket

  );

  IF (prep->>'ok') IS DISTINCT FROM 'true' THEN

    RETURN prep;

  END IF;



  mon := private.streamlink_complete_and_bind(

    prep,

    coalesce(p_shiny, false),

    (private.streamlink_secure_u32() % 25)::int + 1,

    (private.streamlink_secure_u32() % 2147483647)::int,

    (private.streamlink_secure_u32() % 32)::int,

    (private.streamlink_secure_u32() % 32)::int,

    (private.streamlink_secure_u32() % 32)::int,

    (private.streamlink_secure_u32() % 32)::int,

    (private.streamlink_secure_u32() % 32)::int,

    (private.streamlink_secure_u32() % 32)::int,

    private.streamlink_secure_u32(),

    catch_id

  );

  IF (mon->>'ok') IS DISTINCT FROM 'true' THEN

    RETURN mon;

  END IF;



  IF (prep->>'ticketUuid') IS NOT NULL AND btrim(prep->>'ticketUuid') <> '' THEN

    ticket_uuid := (prep->>'ticketUuid')::uuid;

  END IF;

  legal := private.assert_streamlink_legal(mon, p_ctx, ticket_uuid);

  IF (legal->>'ok') IS DISTINCT FROM 'true' THEN

    RETURN legal;

  END IF;



  SELECT initcap(replace(s.slug, '-', ' '))

    INTO v_name

  FROM private.ref_species s

  WHERE s.content_build = prep->>'build'

    AND s.dex = private.streamlink_json_int(prep->'dex');

  v_name := coalesce(nullif(btrim(p_name), ''), v_name, 'Pokemon');

  v_variant := CASE

    WHEN coalesce(p_shiny, false) THEN 'shiny'

    ELSE coalesce(nullif(btrim(p_variant), ''), 'normal')

  END;

  v_public := private.streamlink_next_public_id('SL');

  SELECT coalesce(array_agg(x), ARRAY[]::text[])

    INTO legacy

  FROM jsonb_array_elements_text(mon->'legacyMoves') x;



  BEGIN

    INSERT INTO public.catches (

      id, user_id, dex, name, variant, gender, ball, round_id, source_key,

      public_id, level, pokemon_form_id,

      iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe,

      moves, friendship, height_m, weight_kg,

      nature_id, ability_id, ability_slot,

      ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe,

      move_slots, ruleset_id, content_build,

      hp_current, hp_max, status, held_item, gigantamax_factor

    ) VALUES (

      catch_id,

      p_user_id,

      private.streamlink_json_int(mon->'dex'),

      v_name,

      v_variant,

      coalesce(nullif(btrim(p_gender), ''), mon->>'gender'),

      coalesce(nullif(btrim(p_ball), ''), 'poke'),

      p_round_id,

      p_source_key,

      v_public,

      private.streamlink_json_int(mon->'level'),

      private.streamlink_json_int(mon->'formId'),

      private.streamlink_json_int(mon#>'{ivs,hp}'),

      private.streamlink_json_int(mon#>'{ivs,atk}'),

      private.streamlink_json_int(mon#>'{ivs,def}'),

      private.streamlink_json_int(mon#>'{ivs,spa}'),

      private.streamlink_json_int(mon#>'{ivs,spd}'),

      private.streamlink_json_int(mon#>'{ivs,spe}'),

      legacy,

      private.streamlink_json_int(mon->'friendship'),

      (mon->>'heightM')::numeric,

      (mon->>'weightKg')::numeric,

      private.streamlink_json_int(mon->'natureId'),

      private.streamlink_json_int(mon->'abilityId'),

      mon->>'abilitySlot',

      0, 0, 0, 0, 0, 0,

      mon->'moveSlots',

      mon->>'rulesetId',

      mon->>'contentBuild',

      private.streamlink_json_int(mon->'hpCurrent'),

      private.streamlink_json_int(mon->'hpMax'),

      NULL,

      NULL,

      false

    )

    RETURNING id INTO inserted;

  EXCEPTION WHEN unique_violation THEN

    RETURN jsonb_build_object(

      'ok', false,

      'errors', jsonb_build_array('already-settled'),

      'replay', true,

      'path', 'wire'

    );

  END;



  RETURN jsonb_build_object(

    'ok', true,

    'catchId', inserted,

    'publicId', v_public,

    'path', 'wire',

    'mon', mon

  );

END

$function$
;
revoke all on function private.persist_pass_reward(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text) from public,anon,authenticated;

create function private.hub_deliver_pass(p_user uuid,p_bundle jsonb,p_idem text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing private.hub_reward_deliveries;e jsonb;r private.hub_reward_catalog;flat jsonb:='{}';g jsonb;mon jsonb;delivered jsonb:='[]';i int;ordinal int:=0;v_qty int;inv public.inventories;
begin
 if auth.uid() is null or p_user is null or p_idem is null or length(p_idem)>200 then raise exception 'Invalid delivery request.' using errcode='42501';end if;
 if p_user is distinct from auth.uid() then perform private.require_staff_edit();if private.streamlink_protected_trainer(p_user) then raise exception 'This trainer is protected.' using errcode='42501';end if;end if;
 perform private.hub_validate_rewards(p_bundle,'pass');
 -- Same lock order as normal claims: profile, inventory, then candy/specimens.
 perform 1 from public.profiles where id=p_user for update;if not found then raise exception 'Trainer not found.';end if;
 perform private.ensure_inventory(p_user);select * into inv from public.inventories where user_id=p_user for update;
 insert into private.hub_reward_deliveries(idempotency,actor_id,target_id,bundle,status) values(p_idem,auth.uid(),p_user,p_bundle,'pending') on conflict do nothing;
 if not found then select * into existing from private.hub_reward_deliveries where idempotency=p_idem;
  if existing.actor_id is distinct from auth.uid() or existing.target_id is distinct from p_user or existing.bundle is distinct from p_bundle or existing.status<>'delivered' then raise exception 'Delivery request does not match.';end if;
  return existing.result||jsonb_build_object('duplicate',true);
 end if;
 for e in select value from jsonb_array_elements(p_bundle->'rewards') loop
  select * into r from private.hub_reward_catalog where id=e->>'catalogId';
  if r.kind in ('item','coins','space') then flat:=jsonb_set(flat,array[r.target_key],to_jsonb(coalesce((flat->>r.target_key)::int,0)+(e->>'quantity')::int));end if;
 end loop;
 if coalesce((flat->>'bag_bonus')::int,0)>least(greatest(private.bag_bonus_cap()-inv.bag_bonus,0),greatest(private.bag_capacity_max()-private.bag_capacity(p_user),0)) then raise exception 'This gift exceeds the inventory space limit. Contact staff.';end if;
 -- A zero-coin marker also preserves legacy calendar idempotency for Pokémon/candy-only bundles.
 if not flat?'coins' then flat:=flat||'{"coins":0}'::jsonb;end if;
 g:=private.grant_items(p_user,flat,'DAILY_REWARD',p_idem,p_idem,true);
 if coalesce((g->>'duplicate')::boolean,false) then raise exception 'This reward has already been delivered.';end if;
 for e in select value from jsonb_array_elements(p_bundle->'rewards') loop
  ordinal:=ordinal+1;select * into r from private.hub_reward_catalog where id=e->>'catalogId';v_qty:=(e->>'quantity')::int;
  if r.kind='candy' then perform private.grant_family_candy(p_user,r.target_number,v_qty,'PASS_REWARD','Starlight Pass reward',jsonb_build_object('idempotency',p_idem||':candy:'||ordinal));
  elsif r.kind='pokemon' then for i in 1..v_qty loop
   mon:=private.persist_pass_reward(p_user,r.target_number,(e->>'level')::int,'grant','grant:pass:'||p_idem||':'||ordinal||':'||i,'poke',null,(e->>'shiny')::boolean,'sl-ref-20261013-227b573',null,case when (e->>'shiny')::boolean then 'shiny' else 'normal' end,null,null);
   if mon->>'ok' is distinct from 'true' then raise exception 'A Pokémon could not be generated. Nothing was delivered.';end if;
   delivered:=delivered||jsonb_build_array(jsonb_build_object('catchId',mon->'catchId','publicId',mon->'publicId','name',r.name));
  end loop;end if;
 end loop;
 g:=jsonb_build_object('ok',true,'grants',flat-'coins','coins',flat->'coins','rewardEntries',p_bundle->'rewards','pokemon',delivered,'revealedRewards',private.hub_player_reward_preview(jsonb_build_object('version',2,'rewards',(select jsonb_agg(value||'{"secret":false}'::jsonb order by ord) from jsonb_array_elements(p_bundle->'rewards') with ordinality e(value,ord))),'pass'),'duplicate',false);
 update private.hub_reward_deliveries set status='delivered',result=g where idempotency=p_idem;
 return g;
end $$;
revoke all on function private.hub_deliver_pass(uuid,jsonb,text) from public,anon,authenticated;

create function private.hub_pass_preview() returns jsonb language plpgsql stable set search_path='' as $$
begin return (select jsonb_build_object('daily',private.hub_player_reward_preview(daily,'pass'),'weekly',private.hub_player_reward_preview(weekly,'pass')) from private.hub_pass_settings where id);
exception when others then return jsonb_build_object('daily','[]'::jsonb,'weekly','[]'::jsonb,'unavailable',true);end;
$$;
revoke all on function private.hub_pass_preview() from public,anon,authenticated;

create or replace function public.play_claim_pass(p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();inv public.inventories;bundle jsonb;result jsonb;idem text;begin
 if uid is null then raise exception 'Sign in first.' using errcode='42501';end if;
 perform 1 from public.profiles where id=uid and starlight_pass is true for update;if not found then raise exception 'Starlight Pass is required. Check your subscription first.';end if;
 perform private.ensure_inventory(uid);select * into inv from public.inventories where user_id=uid for update;
 if p_kind='daily' then
  if inv.pass_daily_at is not null and inv.pass_daily_at>now()-interval '20 hours' then raise exception 'Daily Pass gift is not ready yet.';end if;
  select daily into bundle from private.hub_pass_settings where id;
  idem:='pass-daily:'||uid::text||':'||to_char(private.app_today(),'YYYY-MM-DD');
 elsif p_kind='weekly' then
  if inv.pass_weekly_at is not null and inv.pass_weekly_at>now()-interval '6 days' then raise exception 'Weekly Pass crate is not ready yet.';end if;
  select weekly into bundle from private.hub_pass_settings where id;
  idem:='pass-weekly:'||uid::text||':'||to_char(now(),'IYYY-IW');
 else raise exception 'Choose daily or weekly rewards.';end if;
 result:=private.hub_deliver_pass(uid,bundle,idem);
 if (result->>'duplicate')::boolean then raise exception 'This Pass reward has already been delivered.';end if;
 update public.inventories set pass_daily_at=case when p_kind='daily' then now() else pass_daily_at end,pass_weekly_at=case when p_kind='weekly' then now() else pass_weekly_at end,updated_at=now() where user_id=uid;
 return private.play_snapshot(uid)||result||jsonb_build_object('message',case when p_kind='daily' then 'Daily Pass rewards received!' else 'Weekly Pass rewards received!' end);
end $$;
revoke all on function public.play_claim_pass(text) from public,anon;
grant execute on function public.play_claim_pass(text) to authenticated;

CREATE OR REPLACE FUNCTION public.play_store()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
  daily jsonb := '{}'::jsonb;
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
    daily := private.daily_wallet_json(uid);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'passRewards', private.hub_pass_preview(),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days'),
      'dailySupplyReady', coalesce((daily->>'dailySupplyReady')::boolean, true),
      'dailySupplyAt', inv.daily_supply_at,
      'dailyStreakDay', (daily->>'dailyStreakDay')::int,
      'dailyClaimed', coalesce((daily->>'dailyClaimed')::boolean, false),
      'dailyNextDate', daily->>'dailyNextDate',
      'dailyTimezone', daily->>'dailyTimezone',
      'dailyPreview', daily->'dailyPreview',
      'pendingChoices', daily->'pendingChoices'
    ) end
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_trainer_reward_action(p_user uuid, p_request uuid, p_action text, p_payload jsonb, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_prior private.staff_reward_actions;
  v_profile public.profiles; v_override private.staff_pass_overrides;
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb); v_result jsonb;
  v_grants jsonb; v_key text; v_qty integer; v_kind text; v_error text; v_space_before integer;
  v_index integer; v_generated jsonb; v_ids jsonb; v_public_ids jsonb;
BEGIN
  PERFORM private.require_staff_edit();
  IF v_actor IS NULL OR p_user IS NULL OR p_request IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A target, request id and staff reason are required.' USING ERRCODE='22023';
  END IF;
  IF p_action IS NULL OR jsonb_typeof(v_payload)<>'object' OR p_action NOT IN ('pass_on','pass_off','pass_sync','pass_daily','pass_weekly','item','candy','pokemon','pokemon_batch','title','cosmetic','badge') THEN
    RAISE EXCEPTION 'Unknown reward action.' USING ERRCODE='22023';
  END IF;
  -- Profile row serializes concurrent grants and automation against one trainer.
  SELECT * INTO v_profile FROM public.profiles WHERE id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainer not found.' USING ERRCODE='22023'; END IF;
  IF private.streamlink_protected_trainer(p_user) THEN
    RAISE EXCEPTION 'This protected trainer needs a separately scoped authorization.' USING ERRCODE='42501';
  END IF;
  INSERT INTO private.staff_reward_actions(request_id,actor_id,target_id,action,payload,reason,status)
  VALUES(p_request,v_actor,p_user,p_action,v_payload,btrim(p_reason),'pending') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO v_prior FROM private.staff_reward_actions WHERE request_id=p_request;
    IF v_prior.actor_id<>v_actor OR v_prior.target_id<>p_user OR v_prior.action<>p_action OR v_prior.payload<>v_payload OR v_prior.reason<>btrim(p_reason) THEN
      RAISE EXCEPTION 'Request id is already bound to another action.' USING ERRCODE='22023';
    END IF;
    RETURN v_prior.result || jsonb_build_object('requestId',p_request,'replayed',true);
  END IF;
  BEGIN
    IF p_action IN ('pass_on','pass_off') THEN
      INSERT INTO private.staff_pass_overrides(target_id,active,source_before,subscription_active,subscription_source,subscription_checked_at,actor_id,reason)
      VALUES(p_user,p_action='pass_on',v_profile.pass_source,
        coalesce(v_profile.starlight_pass,false) AND coalesce(v_profile.pass_source,'') IN ('twitch-sub','broadcaster'),
        CASE WHEN v_profile.pass_source IN ('twitch-sub','broadcaster') THEN v_profile.pass_source END,
        v_profile.pass_checked_at,v_actor,btrim(p_reason))
      ON CONFLICT(target_id) DO UPDATE SET active=excluded.active,actor_id=excluded.actor_id,reason=excluded.reason,updated_at=now();
      UPDATE public.profiles SET starlight_pass=p_action='pass_on',updated_at=now() WHERE id=p_user;
      v_result:=jsonb_build_object('ok',true,'message','Staff Pass override saved. It remains until cleared.',
        'sourceBefore',v_profile.pass_source,'activeBefore',v_profile.starlight_pass);
    ELSIF p_action='pass_sync' THEN
      DELETE FROM private.staff_pass_overrides WHERE target_id=p_user RETURNING * INTO v_override;
      IF NOT FOUND THEN RAISE EXCEPTION 'There is no staff override to clear.'; END IF;
      UPDATE public.profiles SET starlight_pass=v_override.subscription_active,
        pass_source=v_override.subscription_source,pass_checked_at=v_override.subscription_checked_at,updated_at=now() WHERE id=p_user;
      v_result:=jsonb_build_object('ok',true,'message','Override cleared. Last recorded subscription state restored; a fresh Twitch check may still be needed.');
    ELSIF p_action IN ('pass_daily','pass_weekly') THEN
 SELECT CASE WHEN p_action='pass_daily' THEN daily ELSE weekly END INTO v_grants FROM private.hub_pass_settings WHERE id;
 v_result:=private.hub_deliver_pass(p_user,v_grants,'staff-pass:'||p_request::text);
 ELSIF p_action='item' THEN
      IF p_action='item' THEN
        v_key:=v_payload->>'key'; v_qty:=(v_payload->>'qty')::integer;
        IF coalesce(v_qty,0) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Quantity must be 1 to 10000.'; END IF;
        IF v_key IS NULL OR NOT (v_key=ANY(ARRAY['coins','berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']
          ||private.extra_ball_keys()||private.capture_berry_keys()||private.evo_item_keys()||private.valuable_item_keys())) THEN
          RAISE EXCEPTION 'Item is not enabled for grants.';
        END IF;
        v_grants:=jsonb_build_object(v_key,v_qty);
      ELSE
        v_kind:=CASE WHEN p_action='pass_daily' THEN 'daily' ELSE 'weekly' END;
        v_grants:=private.pass_reward_grants(v_kind);
        IF v_grants IS NULL OR v_grants='{}'::jsonb THEN RAISE EXCEPTION 'Pass reward bundle is unavailable.'; END IF;
      END IF;
      IF EXISTS(SELECT 1 FROM jsonb_each_text(v_grants) e WHERE e.key<>ALL(ARRAY['coins','berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']
        ||private.extra_ball_keys()||private.capture_berry_keys()||private.evo_item_keys()||private.valuable_item_keys())
        OR e.value !~ '^[0-9]+$' OR length(e.value)>5 OR e.value::numeric>10000) THEN RAISE EXCEPTION 'Reward bundle is not valid for full audited delivery.'; END IF;
      SELECT coalesce((SELECT bag_bonus FROM public.inventories WHERE user_id=p_user),0) INTO v_space_before;
      v_result:=private.grant_items(p_user,v_grants,'ADMIN_GRANT','staff-reward:'||p_request::text,'staff-reward:'||p_request::text,true);
      IF coalesce((v_grants->>'bag_bonus')::integer,0)>0 AND
        coalesce((SELECT bag_bonus FROM public.inventories WHERE user_id=p_user),0)-v_space_before<>(v_grants->>'bag_bonus')::integer THEN
        RAISE EXCEPTION 'The inventory-space grant would be capped; nothing was granted.';
      END IF;
      IF NOT coalesce((v_result->>'ok')::boolean,false) OR coalesce((v_result->>'full')::boolean,false) OR coalesce((v_result->>'duplicate')::boolean,false) THEN
        RAISE EXCEPTION 'The complete bundle was not delivered.';
      END IF;
      v_result:=v_result||jsonb_build_object('ok',true,'message','Rewards delivered. Player claim cooldowns were not changed.','requested',v_grants);
    ELSIF p_action='candy' THEN
      v_qty:=(v_payload->>'qty')::integer;
      IF coalesce(v_qty,0) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Quantity must be 1 to 10000.'; END IF;
      PERFORM public.admin_grant_candy(p_user,(v_payload->>'dex')::integer,v_qty);
      v_result:=jsonb_build_object('ok',true,'message','Evolution Candy delivered.');
    ELSIF p_action='pokemon_batch' THEN
      IF jsonb_typeof(v_payload->'qty') IS DISTINCT FROM 'number'
        OR coalesce(v_payload->>'qty','') !~ '^[0-9]+$'
        OR length(v_payload->>'qty')>3 THEN
        RAISE EXCEPTION 'Choose a whole quantity from 2 to 100.';
      END IF;
      v_qty:=(v_payload->>'qty')::integer;
      IF v_qty NOT BETWEEN 2 AND 100 OR coalesce((v_payload->>'dex')::integer,0) NOT BETWEEN 1 AND 151
        OR coalesce((v_payload->>'level')::integer,0) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Choose 2–100 Pokémon, Kanto species 1–151 and level 1–100.';
      END IF;
      v_ids:='[]'::jsonb; v_public_ids:='[]'::jsonb;
      FOR v_index IN 1..v_qty LOOP
        v_generated:=private.persist_staff_gift(p_user,(v_payload->>'dex')::integer,(v_payload->>'level')::integer,
          'grant','grant:staff-reward:'||p_request::text||':'||v_index::text,'poke',NULL,
          coalesce((v_payload->>'shiny')::boolean,false),'sl-ref-20261013-227b573',NULL,
          CASE WHEN coalesce((v_payload->>'shiny')::boolean,false) THEN 'shiny' ELSE 'normal' END,NULL,NULL);
        IF NOT coalesce((v_generated->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Canonical generation rejected the batch.'; END IF;
        v_ids:=v_ids||jsonb_build_array(v_generated->'catchId');
        v_public_ids:=v_public_ids||jsonb_build_array(v_generated->'publicId');
      END LOOP;
      v_result:=jsonb_build_object('ok',true,'quantity',v_qty,'catchIds',v_ids,'publicIds',v_public_ids,'path','wire',
        'message',v_qty::text||' Pokémon delivered through canonical generation.');
    ELSIF p_action='pokemon' THEN
      IF coalesce((v_payload->>'dex')::integer,0) NOT BETWEEN 1 AND 151 OR coalesce((v_payload->>'level')::integer,0) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Choose Kanto species 1–151 and level 1–100.';
      END IF;
      -- Explicit grant context: canonical generator/validator/persistence, no legacy raw INSERT, no WIRE activation.
      v_result:=private.persist_staff_gift(p_user,(v_payload->>'dex')::integer,(v_payload->>'level')::integer,
        'grant','grant:staff-reward:'||p_request::text,'poke',NULL,coalesce((v_payload->>'shiny')::boolean,false),
        'sl-ref-20261013-227b573',NULL,CASE WHEN coalesce((v_payload->>'shiny')::boolean,false) THEN 'shiny' ELSE 'normal' END,NULL,NULL);
      IF NOT coalesce((v_result->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Canonical generation rejected the gift.'; END IF;
      v_result:=v_result||jsonb_build_object('message','Pokémon delivered through canonical generation.');
    ELSE
      v_key:=v_payload->>'id';
      IF p_action='title' THEN PERFORM public.admin_grant_title(p_user,v_key,btrim(p_reason));
      ELSIF p_action='cosmetic' THEN PERFORM public.admin_grant_cosmetic(p_user,v_key,btrim(p_reason));
      ELSIF p_action='badge' THEN PERFORM public.admin_grant_badge(p_user,v_key,btrim(p_reason)); END IF;
      v_result:=jsonb_build_object('ok',true,'message','Unlockable granted.');
    END IF;
    UPDATE private.staff_reward_actions SET status='succeeded',result=v_result,finished_at=now() WHERE request_id=p_request;
  EXCEPTION WHEN OTHERS THEN
    -- Inner transaction rollback preserves the outer receipt, with no partial gift.
    GET STACKED DIAGNOSTICS v_error=RETURNED_SQLSTATE;
    v_result:=jsonb_build_object('ok',false,'message','The action failed; nothing from this request was granted. Check eligibility, inventory limits and enabled catalog entries before a new attempt.');
    UPDATE private.staff_reward_actions SET status='failed',result=v_result,error_code=v_error,finished_at=now() WHERE request_id=p_request;
  END;
  RETURN v_result||jsonb_build_object('requestId',p_request,'replayed',false);
END $function$
;
create or replace function public.admin_save_pass_rewards(p_daily jsonb,p_weekly jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin perform private.require_staff_edit();raise exception 'Open Game Configuration / Pass rewards to edit daily and weekly gifts.';end $$;
