do $guard$ begin
if md5(pg_get_functiondef('private.assert_catch_tradable()'::regprocedure)) is distinct from '5b8a5a32e6c1b83a8dd835e4c4ab0a30' then raise exception 'Source drift: assert_catch_tradable';end if;
if md5(pg_get_functiondef('public.admin_remove_pokemon(uuid,uuid)'::regprocedure)) is distinct from 'ffb355ee581086ad2f63fd14e54206dd' then raise exception 'Source drift: admin_remove_pokemon';end if;
if md5(pg_get_functiondef('public.admin_set_coins(uuid,integer)'::regprocedure)) is distinct from 'fd8fbdfb5c9099f2fccbd1279581e2ce' then raise exception 'Source drift: admin_set_coins';end if;
if to_regclass('private.trainer_corrections') is not null then raise exception 'Correction migration conflicts.';end if;end $guard$;

create table private.trainer_corrections(
 request_id uuid primary key,actor_id uuid not null,target_id uuid not null,reason text not null,
 request_body jsonb not null,status text not null check(status in ('pending','saved')),
 before_state jsonb,after_state jsonb,result jsonb,created_at timestamptz not null default now());
create index trainer_corrections_target_date on private.trainer_corrections(target_id,created_at desc);
alter table private.trainer_corrections enable row level security;
revoke all on private.trainer_corrections from public,anon,authenticated;

create function private.hub_correction_strip_refs(value jsonb,ids text[]) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb;begin
 if value is null then return null;end if;
 if jsonb_typeof(value)='string' then if (value#>>'{}')=any(ids) then return 'null'::jsonb;end if;return value;
 elsif jsonb_typeof(value)='array' then select coalesce(jsonb_agg(private.hub_correction_strip_refs(v,ids) order by ord),'[]'::jsonb) into result from jsonb_array_elements(value) with ordinality a(v,ord);return result;
 elsif jsonb_typeof(value)='object' then
  if value->>'id'=any(ids) then return 'null'::jsonb;end if;
  select coalesce(jsonb_object_agg(k,private.hub_correction_strip_refs(v,ids)),'{}'::jsonb) into result from jsonb_each(value) a(k,v) where not(k=any(ids));return result;
 end if;return value;end $$;
revoke all on function private.hub_correction_strip_refs(jsonb,text[]) from public,anon,authenticated;

create function private.hub_trainer_correction_snapshot(p_user uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare inv public.inventories;p public.profiles;vals jsonb;mons jsonb;protected boolean;base_space int;cap int;used int;
begin
 select * into p from public.profiles where id=p_user;if not found then raise exception 'Trainer not found.' using errcode='22023';end if;
 select * into inv from public.inventories where user_id=p_user;if not found then raise exception 'This trainer needs to open their account once before inventory corrections are available.' using errcode='22023';end if;
 protected:=coalesce(private.streamlink_protected_trainer(p_user),true);base_space:=50+case when p.starlight_pass then 25 else 0 end;cap:=private.bag_capacity(p_user);used:=private.item_total(inv);
 with core(id,name,value,storage,key,kind,minimum,maximum) as(values
 ('coins','PokéCoins',inv.coins,'coins','coins','balance',0,2147483647),
 ('capacity','Total inventory spaces',cap,'capacity','bag_bonus','capacity',base_space,least(private.bag_capacity_max(),base_space+private.bag_bonus_cap())),
 ('item:berry','Berry',inv.berry,'core','berry','item',0,cap),
 ('item:bait','Honey',inv.bait,'core','bait','item',0,cap),
 ('item:pokeball','Poké Ball',inv.pokeball,'core','pokeball','item',0,cap),
 ('item:greatball','Great Ball',inv.greatball,'core','greatball','item',0,cap),
 ('item:ultraball','Ultra Ball',inv.ultraball,'core','ultraball','item',0,cap),
 ('item:lure','Poké Radar',inv.lure,'core','lure','item',0,cap)
 ), bags as (
 select 'ball:'||key id,key,value::int value,'balls' storage from jsonb_each_text(coalesce(inv.balls,'{}')) where value::int>0
 union all select 'berry:'||key,key,value::int,'berries' from jsonb_each_text(coalesce(inv.berries,'{}')) where value::int>0
 union all select 'stored:'||key,key,value::int,'items' from jsonb_each_text(coalesce(inv.items,'{}')) where value::int>0
 ), all_values as (
 select *,case when storage='capacity' then inv.bag_bonus else value end stored_value,case when storage='capacity' then used else null end used from core
 union all select b.id,coalesce(c.name,'Unlisted item ('||b.key||')'),b.value,b.storage,b.key,'item',0,case when c.enabled then cap else b.value end,b.value,null from bags b left join private.hub_reward_catalog c on c.kind='item' and c.target_key=b.key
 union all select 'candy:'||f.family_id,coalesce(c.name,ef.name||' Evolution Candy','Unlisted Evolution Candy'),f.qty,'candy',f.family_id::text,'candy',0,case when c.enabled then 2147483647 else f.qty end,f.qty,null from public.family_candy f left join public.evolution_families ef on ef.id=f.family_id left join private.hub_reward_catalog c on c.id='candy:'||f.family_id where f.user_id=p_user and f.qty>0
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'value',a.value,'storage',a.storage,'key',a.key,'kind',a.kind,'minimum',a.minimum,'maximum',a.maximum,'storedValue',a.stored_value,'used',a.used,'editable',not protected,'sprite',case when a.id='capacity' then 'images/items/inventory-bag.png' else coalesce((select c.sprite from private.hub_reward_catalog c where c.id=a.id or (c.kind='item' and c.target_key=a.key) limit 1),'images/items/inventory-bag.png') end) order by case when a.kind in ('balance','capacity') then 0 else 1 end,a.name,a.id),'[]'::jsonb) into vals from all_values a;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'publicId',c.public_id,'name',coalesce(nullif(c.nickname,''),c.name),'level',c.level,'dex',c.dex,'variant',c.variant,'locked',c.locked,'favorite',c.favorite,
 'battleData',private.admin_catch_battle_json(c),'signature',md5(to_jsonb(c)::text),'hpCurrent',c.hp_current,'hpMax',c.hp_max,'moves',c.moves,
 'trading',c.reserved_trade_id is not null or exists(select 1 from public.trade_listings l where l.catch_id=c.id and l.status='open') or exists(select 1 from public.trade_offers o where o.catch_id=c.id and o.status='pending') or exists(select 1 from public.direct_trades t where (t.a_catch=c.id or t.b_catch=c.id) and t.status in ('PENDING','NEGOTIATING','PROCESSING') and t.expires_at>now())) order by c.id),'[]'::jsonb) into mons from public.catches c where c.user_id=p_user and c.transferred_at is null;
 return jsonb_build_object('trainerId',p_user,'protected',protected,'values',vals,'pokemon',mons,'revision',md5(jsonb_build_object('values',vals,'pokemon',mons,'protected',protected)::text));
end $$;
revoke all on function private.hub_trainer_correction_snapshot(uuid) from public,anon,authenticated;

create function public.admin_trainer_corrections_read(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.require_staff_edit();return private.hub_trainer_correction_snapshot(p_user)||jsonb_build_object('history',(select coalesce(jsonb_agg(x order by x->>'createdAt' desc),'[]'::jsonb) from (select jsonb_build_object('requestId',a.request_id,'actor',coalesce(p.display_name,p.username,'Staff'),'reason',a.reason,'createdAt',a.created_at,'correction',a.request_body->'correction','status',a.status) x from private.trainer_corrections a left join public.profiles p on p.id=a.actor_id where a.target_id=p_user and a.status='saved' order by a.created_at desc limit 25) h));end $$;
revoke all on function public.admin_trainer_corrections_read(uuid) from public,anon;
grant execute on function public.admin_trainer_corrections_read(uuid) to authenticated;

create function public.admin_trainer_correction_write(p_intent jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();target uuid;request uuid;prior private.trainer_corrections;snapshot jsonb;change jsonb;v_row jsonb;ids uuid[];keys text[];n int;after_value int;before_value int;delta int;v_before_state jsonb;v_after_state jsonb;receipt jsonb;ptr jsonb;base_space int;
begin
 perform private.require_staff_edit();
 if uid is null or jsonb_typeof(p_intent) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_intent))<>5 or exists(select 1 from jsonb_object_keys(p_intent) k where k not in ('trainerId','requestId','expectedRevision','reason','correction')) then raise exception 'Reload before making a correction.' using errcode='22023';end if;
 target:=(p_intent->>'trainerId')::uuid;request:=(p_intent->>'requestId')::uuid;
 if target is null or request is null or jsonb_typeof(p_intent->'reason') is distinct from 'string' or length(btrim(p_intent->>'reason')) not between 3 and 1000 then raise exception 'Add a staff reason between 3 and 1,000 characters.' using errcode='22023';end if;
 select * into prior from private.trainer_corrections where request_id=request;
 if found then if prior.actor_id is distinct from uid or prior.target_id is distinct from target or prior.request_body is distinct from p_intent or prior.status<>'saved' then raise exception 'That request does not match the saved correction.' using errcode='22023';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 if private.streamlink_protected_trainer(target) is not false then raise exception 'Account corrections are disabled for this protected trainer.' using errcode='42501';end if;
 change:=p_intent->'correction';
 if change->>'type'='removePokemon' then
  if jsonb_typeof(change->'ids') is distinct from 'array' or jsonb_array_length(change->'ids') not between 1 and 100 or (select count(*) from jsonb_object_keys(change))<>2 or exists(select 1 from jsonb_object_keys(change) k where k not in ('type','ids')) or exists(select 1 from jsonb_array_elements(change->'ids') v where jsonb_typeof(v)<>'string') then raise exception 'Select the exact Pokémon to remove.' using errcode='22023';end if;
  select array_agg((v#>>'{}')::uuid order by (v#>>'{}')::uuid) into ids from jsonb_array_elements(change->'ids') v;
  if (select count(distinct x) from unnest(ids) x)<>cardinality(ids) then raise exception 'Each Pokémon can be selected once.' using errcode='22023';end if;
  perform c.id from public.catches c where c.id=any(ids) and c.user_id=target and c.transferred_at is null order by c.id for update nowait;
  -- Existing listing creation can lock profiles first. Refuse a busy profile rather than creating a lock cycle.
  perform 1 from public.profiles where id=target for update nowait;
 elsif change->>'type'='quantity' then
  if change->>'id'='capacity' then perform 1 from public.profiles where id=target for update nowait;end if;
  perform 1 from public.inventories where user_id=target for update nowait;
  if change->>'id' like 'candy:%' then perform 1 from public.family_candy where user_id=target and family_id=substring(change->>'id' from 7)::int for update nowait;end if;
 else raise exception 'Choose a supported correction.' using errcode='22023';end if;
 if private.streamlink_protected_trainer(target) is not false then raise exception 'Account corrections are disabled for this protected trainer.' using errcode='42501';end if;
 snapshot:=private.hub_trainer_correction_snapshot(target);
 if p_intent->>'expectedRevision' is distinct from snapshot->>'revision' then raise exception 'This trainer changed. Reload before saving.' using errcode='40001';end if;
 insert into private.trainer_corrections(request_id,actor_id,target_id,reason,request_body,status) values(request,uid,target,btrim(p_intent->>'reason'),p_intent,'pending') on conflict do nothing;
 if not found then select * into prior from private.trainer_corrections where request_id=request;if prior.actor_id is distinct from uid or prior.target_id is distinct from target or prior.request_body is distinct from p_intent or prior.status<>'saved' then raise exception 'That request does not match the saved correction.' using errcode='22023';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 if change->>'type'='quantity' then
  if (select count(*) from jsonb_object_keys(change))<>4 or exists(select 1 from jsonb_object_keys(change) k where k not in ('type','id','before','after')) or jsonb_typeof(change->'before') is distinct from 'number' or jsonb_typeof(change->'after') is distinct from 'number' then raise exception 'Choose a whole resulting quantity.' using errcode='22023';end if;
  select v into v_row from jsonb_array_elements(snapshot->'values') v where v->>'id'=change->>'id';
  if v_row is null or v_row->>'editable' is distinct from 'true' or (change->>'after')::numeric<>trunc((change->>'after')::numeric) or (change->>'after')::numeric not between (v_row->>'minimum')::numeric and (v_row->>'maximum')::numeric then raise exception 'Choose a quantity within the displayed limits.' using errcode='22023';end if;
  before_value:=(v_row->>'value')::int;after_value:=(change->>'after')::int;
  if change->'before' is distinct from to_jsonb(before_value) or after_value=before_value then raise exception 'The current quantity changed or no correction was made.' using errcode='40001';end if;
  delta:=after_value-before_value;v_before_state:=v_row;
  case v_row->>'storage'
   when 'coins' then perform private.adjust_coins(target,delta,'ADMIN_ADJUSTMENT',btrim(p_intent->>'reason'),jsonb_build_object('idempotency','correction:'||request::text,'correctionId',request));
   when 'capacity' then
    if after_value<(v_row->>'used')::int then raise exception 'Capacity cannot be lower than the space already used.' using errcode='22023';end if;
    base_space:=(v_row->>'minimum')::int;update public.inventories set bag_bonus=after_value-base_space,updated_at=now() where user_id=target;
   when 'core' then
    if v_row->>'key'<>all(array['berry','bait','pokeball','greatball','ultraball','lure']) then raise exception 'Unsupported inventory balance.';end if;
    execute format('update public.inventories set %I=$1,updated_at=now() where user_id=$2',v_row->>'key') using after_value,target;
   when 'balls' then update public.inventories set balls=jsonb_set(coalesce(balls,'{}'),array[v_row->>'key'],to_jsonb(after_value)),updated_at=now() where user_id=target;
   when 'berries' then update public.inventories set berries=jsonb_set(coalesce(berries,'{}'),array[v_row->>'key'],to_jsonb(after_value)),updated_at=now() where user_id=target;
   when 'items' then update public.inventories set items=jsonb_set(coalesce(items,'{}'),array[v_row->>'key'],to_jsonb(after_value)),updated_at=now() where user_id=target;
   when 'candy' then update public.family_candy set qty=after_value where user_id=target and family_id=(v_row->>'key')::int;
    insert into public.candy_ledger(user_id,family_id,amount,type,reason,idempotency,qty_before,qty_after) values(target,(v_row->>'key')::int,delta,'ADMIN_ADJUSTMENT',btrim(p_intent->>'reason'),'correction:'||request::text,before_value,after_value);
   else raise exception 'Unsupported inventory balance.' using errcode='22023';
  end case;
  if (select private.item_total(i)>private.bag_capacity(target) from public.inventories i where i.user_id=target) then raise exception 'The resulting inventory would exceed capacity.' using errcode='22023';end if;
  if v_row->>'storage' not in ('coins','candy') then insert into public.item_ledger(user_id,item_key,amount,reason,source_id,idempotency) values(target,v_row->>'key',delta,'ADMIN_ADJUSTMENT',request::text,'correction:'||request::text);end if;
  v_after_state:=v_row||jsonb_build_object('value',after_value,'storedValue',case when v_row->>'storage'='capacity' then after_value-base_space else after_value end);
 else
  if exists(select 1 from unnest(ids) x where not exists(select 1 from jsonb_array_elements(snapshot->'pokemon') m where m->>'id'=x::text and m->>'locked'='false' and m->>'favorite'='false' and m->>'trading'='false')) then raise exception 'A selected Pokémon is unavailable, locked, favorited or in a trade.' using errcode='22023';end if;
  select jsonb_build_object('team_ids',p.team_ids,'pc_layout',p.pc_layout,'showcase',p.showcase) into ptr from public.profiles p where p.id=target;
  v_before_state:=jsonb_build_object('pokemon',(select jsonb_agg(to_jsonb(c) order by c.id) from public.catches c where c.id=any(ids)),'profilePointers',ptr);
  select array_agg(x::text) into keys from unnest(ids) x;
  update public.catches set transferred_at=now() where id=any(ids) and user_id=target and transferred_at is null;
  get diagnostics n=row_count;if n<>cardinality(ids) then raise exception 'A selected Pokémon changed ownership.' using errcode='40001';end if;
  update public.profiles set team_ids=case when team_ids is null then null else array(select x from unnest(team_ids) with ordinality a(x,ord) where not(x=any(ids)) order by ord) end,pc_layout=private.hub_correction_strip_refs(pc_layout,keys),showcase=private.hub_correction_strip_refs(showcase,keys),updated_at=now() where id=target;
  v_after_state:=jsonb_build_object('pokemon',(select jsonb_agg(to_jsonb(c) order by c.id) from public.catches c where c.id=any(ids)),'profilePointers',(select jsonb_build_object('team_ids',p.team_ids,'pc_layout',p.pc_layout,'showcase',p.showcase) from public.profiles p where p.id=target));
 end if;
 receipt:=jsonb_build_object('status','saved','requestId',request,'trainerId',target,'replayed',false);
 update private.trainer_corrections set before_state=v_before_state,after_state=v_after_state,result=receipt,status='saved' where request_id=request;
 return receipt;
end $$;
revoke all on function public.admin_trainer_correction_write(jsonb) from public,anon;
grant execute on function public.admin_trainer_correction_write(jsonb) to authenticated;

-- Validate current active ownership while serializing listing/offer creation with removal.
create or replace function private.assert_catch_tradable() returns trigger language plpgsql set search_path='' as $$
declare c public.catches;begin
 if (tg_table_name='trade_listings' and new.status<>'open') or (tg_table_name='trade_offers' and new.status<>'pending') then return new;end if;
 select * into c from public.catches where id=new.catch_id for update;
 if c.id is null or c.user_id is distinct from new.user_id or c.transferred_at is not null then raise exception 'That Pokémon is no longer in this trainer collection.';end if;
 if c.locked or c.favorite then raise exception 'A locked or favorite Pokémon cannot be traded.';end if;
 if exists(select 1 from public.species s where s.dex=c.dex and s.tradable=false) then raise exception 'That Pokémon cannot be traded.';end if;
 if c.trade_locked_until is not null and c.trade_locked_until>now() then raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';end if;
 return new;end $$;

create function private.hub_validate_direct_trade_hold() returns trigger language plpgsql set search_path='' as $$
declare c public.catches;begin
 if new.status not in ('PENDING','NEGOTIATING') then return new;end if;
 perform x.id from public.catches x where x.id=any(array[new.a_catch,new.b_catch]) order by x.id for update;
 if new.a_catch is not null and not exists(select 1 from public.catches x where x.id=new.a_catch and x.user_id=new.a_user and x.transferred_at is null and not x.locked and not x.favorite) then raise exception 'The offered Pokémon is no longer available.';end if;
 if new.b_catch is not null and not exists(select 1 from public.catches x where x.id=new.b_catch and x.user_id=new.b_user and x.transferred_at is null and not x.locked and not x.favorite) then raise exception 'The offered Pokémon is no longer available.';end if;
 return new;end $$;
revoke all on function private.hub_validate_direct_trade_hold() from public,anon,authenticated;
create trigger hub_direct_trade_hold before insert or update on public.direct_trades for each row execute function private.hub_validate_direct_trade_hold();

create or replace function public.admin_set_coins(p_user uuid,p_coins integer) returns jsonb language plpgsql security definer set search_path='' as $$begin perform private.require_staff_edit();raise exception 'Open Trainers / Corrections to set a balance with a reason and review.';end $$;
create or replace function public.admin_remove_pokemon(p_user uuid,p_catch_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin perform private.require_staff_edit();raise exception 'Open Trainers / Corrections to select the exact Pokémon and record the reason.';end $$;
