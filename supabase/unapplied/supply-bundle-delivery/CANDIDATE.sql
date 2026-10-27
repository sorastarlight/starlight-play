CREATE OR REPLACE FUNCTION private.pc_deliver_items(p_uid uuid, p_grants jsonb, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE inv public.inventories;k text;n integer;fit integer;room integer;bundle_total bigint;whole_bundle boolean;bag jsonb:='{}';stored jsonb:='{}';
BEGIN
 PERFORM private.ensure_inventory(p_uid);
 SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inventory unavailable.'; END IF;
 IF coalesce((p_grants->>'bag_bonus')::int,0)<>0 THEN PERFORM private.grant_known(p_uid,jsonb_build_object('bag_bonus',(p_grants->>'bag_bonus')::int));bag:=jsonb_build_object('bag_bonus',(p_grants->>'bag_bonus')::int);END IF;
 SELECT coalesce(sum(value::integer),0) INTO bundle_total FROM jsonb_each_text(p_grants-'bag_bonus');
 whole_bundle:=p_reason='DAILY_REWARD';
 SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid;
 room:=greatest(0,private.bag_capacity(p_uid)-private.item_total(inv));
 whole_bundle:=whole_bundle AND bundle_total>room;
 FOR k,n IN SELECT key,value::integer FROM jsonb_each_text(p_grants-'bag_bonus') ORDER BY key LOOP
  IF n<0 THEN RAISE EXCEPTION 'Rewards cannot remove items.'; END IF;
  IF n=0 THEN CONTINUE; END IF;
  PERFORM private.pc_item_location(k);
  SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid;
  room:=greatest(0,private.bag_capacity(p_uid)-private.item_total(inv));fit:=CASE WHEN whole_bundle THEN 0 ELSE least(n,room) END;
  IF fit>0 THEN PERFORM private.pc_bag_adjust(p_uid,k,fit);bag:=bag||jsonb_build_object(k,fit);END IF;
  IF n>fit THEN PERFORM private.pc_store_items(p_uid,k,n-fit,p_reason);stored:=stored||jsonb_build_object(k,n-fit);END IF;
 END LOOP;
 IF stored<>'{}'::jsonb THEN PERFORM private.push_notice(p_uid,'loot','Items sent to My PC','Your bag did not have enough room. Withdraw these items from My PC before using them.',jsonb_build_object('stored',stored,'destination','storage.html#items')); END IF;
 RETURN jsonb_build_object('inBag',bag,'stored',stored);
END;$function$;

CREATE OR REPLACE FUNCTION private.hub_deliver_pass(p_user uuid, p_bundle jsonb, p_idem text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 g:=jsonb_build_object('delivery',jsonb_build_object('inBag',g->'inBag','stored',g->'stored'),'receiptId',p_idem,'ok',true,'grants',flat-'coins','coins',flat->'coins','rewardEntries',p_bundle->'rewards','pokemon',delivered,'revealedRewards',private.hub_player_reward_preview(jsonb_build_object('version',2,'rewards',(select jsonb_agg(value||'{"secret":false}'::jsonb order by ord) from jsonb_array_elements(p_bundle->'rewards') with ordinality e(value,ord))),'pass'),'duplicate',false);
 update private.hub_reward_deliveries set status='delivered',result=g where idempotency=p_idem;
 return g;
end $function$;



