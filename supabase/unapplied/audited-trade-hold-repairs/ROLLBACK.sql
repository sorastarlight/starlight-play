do $guard$ begin
if md5(pg_get_functiondef('private.hub_trade_hold(public.catches)'::regprocedure)) is distinct from '632b58cf66e28a0e695bc721ba24bece' then raise exception 'Trade hold rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_trainer_correction_write(jsonb)'::regprocedure)) is distinct from 'ffed8580df438d9d3e24de26c3629c41' then raise exception 'Trade hold rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_trainer_corrections_read(uuid)'::regprocedure)) is distinct from '8dd604122ef048533fd1cc3abc5d9023' then raise exception 'Trade hold rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_unlock_catch(uuid,text)'::regprocedure)) is distinct from '0f95f2793327fc4bfd0e42fb6dd767f4' then raise exception 'Trade hold rollback source drift';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_unlock_catch(p_catch uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c public.catches;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select * into c from public.catches where id = p_catch for update;
  if c.id is null then raise exception 'Pokémon not found.'; end if;
  update public.catches set locked = false, reserved_trade_id = null, trade_locked_until = null where id = c.id;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Unlocked catch ' || c.id::text || ' for ' || coalesce(nullif(p_reason, ''), 'support') || ' (dex ' || c.dex::text || ')');
  return jsonb_build_object('ok', true, 'message', 'Lock cleared. Ownership was not changed.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_trainer_corrections_read(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin perform private.require_staff_edit();return private.hub_trainer_correction_snapshot(p_user)||jsonb_build_object('pokemonOptions',(select coalesce(jsonb_agg(jsonb_build_object('catalogId',r.id,'dex',r.target_number,'name',r.name,'sprite',r.sprite) order by r.target_number),'[]'::jsonb) from private.hub_reward_catalog r where r.kind='pokemon' and r.enabled),'history',(select coalesce(jsonb_agg(x order by x->>'createdAt' desc),'[]'::jsonb) from (select jsonb_build_object('requestId',a.request_id,'actor',coalesce(p.display_name,p.username,'Staff'),'reason',a.reason,'createdAt',a.created_at,'correction',a.request_body->'correction','status',a.status) x from private.trainer_corrections a left join public.profiles p on p.id=a.actor_id where a.target_id=p_user and a.status='saved' order by a.created_at desc limit 25) h));end $function$
;
CREATE OR REPLACE FUNCTION public.admin_trainer_correction_write(p_intent jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();target uuid;request uuid;prior private.trainer_corrections;snapshot jsonb;change jsonb;v_row jsonb;ids uuid[];keys text[];n int;after_value int;before_value int;delta int;v_before_state jsonb;v_after_state jsonb;receipt jsonb;ptr jsonb;base_space int;v_catalog private.hub_reward_catalog;v_generated jsonb;v_added uuid[]:=array[]::uuid[];v_i int;v_count int;
begin
 perform private.require_staff_edit();
 if uid is null or jsonb_typeof(p_intent) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_intent))<>5 or exists(select 1 from jsonb_object_keys(p_intent) k where k not in ('trainerId','requestId','expectedRevision','reason','correction')) then raise exception 'Reload before making a correction.' using errcode='22023';end if;
 target:=(p_intent->>'trainerId')::uuid;request:=(p_intent->>'requestId')::uuid;
 if target is null or request is null or jsonb_typeof(p_intent->'reason') is distinct from 'string' or length(btrim(p_intent->>'reason')) not between 3 and 1000 then raise exception 'Add a staff reason between 3 and 1,000 characters.' using errcode='22023';end if;
 select * into prior from private.trainer_corrections where request_id=request;
 if found then if prior.actor_id is distinct from uid or prior.target_id is distinct from target or prior.request_body is distinct from p_intent or prior.status<>'saved' then raise exception 'That request does not match the saved correction.' using errcode='22023';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 if private.streamlink_protected_trainer(target) is not false then raise exception 'Account corrections are disabled for this protected trainer.' using errcode='42501';end if;
 change:=p_intent->'correction';
 if change->>'type'='pokemonQuantity' then
  if (select count(*) from jsonb_object_keys(change))<>7 or exists(select 1 from jsonb_object_keys(change) k where k not in ('type','catalogId','before','after','level','shiny','version')) or change->>'version'<>'1' or jsonb_typeof(change->'before') is distinct from 'number' or jsonb_typeof(change->'after') is distinct from 'number' or jsonb_typeof(change->'level') is distinct from 'number' or jsonb_typeof(change->'shiny') is distinct from 'boolean' then raise exception 'Choose the resulting Pokemon quantity and generation options.' using errcode='22023';end if;
  select * into v_catalog from private.hub_reward_catalog where id=change->>'catalogId' and kind='pokemon' and enabled;
  if v_catalog.id is null or coalesce(change->>'before','')!~'^[0-9]{1,10}$' or coalesce(change->>'after','')!~'^[0-9]{1,10}$' or coalesce(change->>'level','')!~'^[0-9]{1,3}$' then raise exception 'Choose a supported Pokemon and whole quantities.' using errcode='22023';end if;
  if (change->>'before')::numeric>2147483647 or (change->>'after')::numeric>2147483647 or (change->>'after')::numeric-(change->>'before')::numeric not between 1 and 100 or (change->>'level')::int not between 1 and 100 then raise exception 'Add from1 to100 Pokemon at level1 to100. Select exact specimens for reductions.' using errcode='22023';end if;
  perform c.id from public.catches c where c.user_id=target and c.transferred_at is null order by c.id for update nowait;perform 1 from public.profiles where id=target for update nowait;perform 1 from public.inventories where user_id=target for update nowait;
 elsif change->>'type'='removePokemon' then
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
 if change->>'type'='pokemonQuantity' then
  select count(*) into v_count from public.catches where user_id=target and transferred_at is null and dex=v_catalog.target_number;
  if v_count<>(change->>'before')::int then raise exception 'The Pokemon quantity changed. Reload this trainer.' using errcode='40001';end if;
  v_before_state:=jsonb_build_object('dex',v_catalog.target_number,'quantity',v_count);
  for v_i in 1..((change->>'after')::int-v_count) loop
   v_generated:=private.persist_staff_correction(target,v_catalog.target_number,(change->>'level')::int,'grant','grant:staff-correction:'||request::text||':'||v_i,'poke',null,(change->>'shiny')::boolean,'sl-ref-20261013-227b573',null,case when (change->>'shiny')::boolean then 'shiny' else 'normal' end,null,null);
   if v_generated->>'ok' is distinct from 'true' then raise exception 'Pokemon generation failed. No correction was saved.' using errcode='22023';end if;
   v_added:=array_append(v_added,(v_generated->>'catchId')::uuid);
  end loop;
  v_after_state:=jsonb_build_object('dex',v_catalog.target_number,'quantity',(change->>'after')::int,'createdIds',v_added,'pokemon',(select jsonb_agg(to_jsonb(c) order by c.id) from public.catches c where c.id=any(v_added)));
 elsif change->>'type'='quantity' then
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
end $function$
;
revoke execute on function private.hub_trade_hold(public.catches) from public,anon,authenticated;
-- Retain all specimen and audit data;restores the unsafe legacy direct unlock so security review is required.
