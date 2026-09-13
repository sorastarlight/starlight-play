-- Player RPCs for evolution, collection, locks, and direct trades.

create or replace function public.play_collection()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'ok', true,
    'items', coalesce((select items from public.inventories where user_id = uid), '{}'::jsonb),
    'candy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'familyId', f.id, 'name', f.name || ' Candy', 'baseDex', f.base_dex, 'qty', c.qty
      ) order by f.id)
      from public.family_candy c
      join public.evolution_families f on f.id = c.family_id
      where c.user_id = uid and c.qty > 0
    ), '[]'::jsonb),
    'ready', coalesce((
      select jsonb_agg(jsonb_build_object(
        'catchId', m.id, 'dex', m.dex, 'name', m.name, 'variant', m.variant, 'gender', m.gender,
        'ruleId', r.id, 'toDex', r.to_dex, 'toName', s.name, 'candyCost', r.candy_cost,
        'haveCandy', coalesce(fc.qty, 0), 'item', r.required_item,
        'haveItem', case when r.required_item is null then true else coalesce((i.items->>r.required_item)::int, 0) > 0 or (r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready) end,
        'tradeReady', m.trade_evo_ready, 'favorite', m.favorite, 'locked', m.locked
      ) order by m.dex)
      from public.catches m
      join public.evolution_rules r on r.from_dex = m.dex and r.enabled
      join public.species s on s.dex = r.to_dex
      left join public.family_candy fc on fc.user_id = uid and fc.family_id = r.family_id
      left join public.inventories i on i.user_id = uid
      where m.user_id = uid and m.transferred_at is null
    ), '[]'::jsonb),
    'mastery', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dex', sm.dex, 'points', sm.points, 'rank', sm.rank,
        'caught', (select count(*) from public.catches c where c.user_id = uid and c.dex = sm.dex),
        'lifetime', (select count(*) from public.catches c where c.user_id = uid and c.dex = sm.dex and c.round_id is not null)
      ) order by sm.dex)
      from public.species_mastery sm
      where sm.user_id = uid
    ), '[]'::jsonb),
    'owned', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant, 'gender', c.gender,
        'favorite', c.favorite, 'locked', c.locked, 'method', c.obtained_method,
        'otName', c.ot_name, 'tradeEvoReady', c.trade_evo_ready, 'shiny', c.variant like '%shiny%'
      ) order by c.dex, c.caught_at)
      from public.catches c
      where c.user_id = uid and c.transferred_at is null
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.play_evolve(p_catch uuid, p_rule text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  return private.evolve_catch(auth.uid(), p_catch, p_rule, 'evo:' || p_catch::text || ':' || p_rule);
end;
$function$;

create or replace function public.play_set_mon_flags(p_catch uuid, p_favorite boolean default null, p_locked boolean default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  update public.catches
     set favorite = coalesce(p_favorite, favorite),
         locked = coalesce(p_locked, locked)
   where id = p_catch and user_id = uid and transferred_at is null;
  if not found then raise exception 'That Pokémon is not in your collection.'; end if;
  return jsonb_build_object('ok', true, 'message', 'Pokémon updated.');
end;
$function$;

create or replace function public.play_release(p_catch uuid, p_confirm text default '')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  c public.catches;
  spec public.species;
  copies int;
  pay int;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into c from public.catches where id = p_catch and user_id = uid and transferred_at is null for update;
  if c.id is null then raise exception 'That Pokémon is not in your collection.'; end if;
  if c.favorite or c.locked then raise exception 'Favorite or locked Pokémon cannot be released.'; end if;
  if c.variant like '%shiny%' and p_confirm <> 'SHINY' then
    raise exception 'This is a SHINY Pokémon. Confirm release with SHINY.';
  end if;
  select count(*) into copies from public.catches where user_id = uid and dex = c.dex and transferred_at is null;
  if copies <= 1 then
    raise exception 'This is your only currently owned % . Keep it for your Living Dex.', c.name;
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Cancel the trade listing first.';
  end if;
  select * into spec from public.species where dex = c.dex;
  pay := case spec.evo_stage when 2 then 2 when 3 then 3 else 1 end;
  perform private.grant_family_candy(uid, coalesce(spec.family_id, c.dex), pay, 'RELEASE_REWARD', 'Released a duplicate',
    jsonb_build_object('idempotency', 'release:' || c.id::text, 'catchId', c.id::text));
  update public.catches set transferred_at = now(), user_id = uid where id = c.id;
  update public.trainer_stats set released = released + 1, updated_at = now() where user_id = uid;
  perform private.pull_from_team(uid, c.id);
  return jsonb_build_object('ok', true, 'message', 'Released ' || c.name || ' for ' || pay || ' Candy.');
end;
$function$;

create or replace function public.play_direct_trade_create(p_login text, p_catch uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  partner uuid;
  c public.catches;
  rec public.direct_trades;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select id into partner from public.profiles where lower(twitch_login) = lower(btrim(p_login));
  if partner is null or partner = uid then raise exception 'Pick another trainer.'; end if;
  select * into c from public.catches where id = p_catch and user_id = uid and transferred_at is null;
  if c.id is null or c.locked or c.favorite then raise exception 'That Pokémon cannot be offered.'; end if;
  if exists (select 1 from public.species s where s.dex = c.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  insert into public.direct_trades (a_user, b_user, a_catch, status, expires_at)
  values (uid, partner, c.id, 'NEGOTIATING', now() + interval '15 minutes')
  returning * into rec;
  return jsonb_build_object('ok', true, 'trade', rec, 'message', 'Trade request sent.');
end;
$function$;

create or replace function public.play_direct_trade_set(p_id uuid, p_catch uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.direct_trades;
  c public.catches;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into rec from public.direct_trades where id = p_id for update;
  if rec.id is null or rec.status not in ('PENDING','NEGOTIATING') or rec.expires_at < now() then
    raise exception 'That trade is no longer open.';
  end if;
  if uid <> rec.a_user and uid <> rec.b_user then raise exception 'That trade is not yours.'; end if;
  select * into c from public.catches where id = p_catch and user_id = uid and transferred_at is null;
  if c.id is null or c.locked or c.favorite then raise exception 'That Pokémon cannot be offered.'; end if;
  if exists (select 1 from public.species s where s.dex = c.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  if uid = rec.a_user then
    update public.direct_trades set a_catch = c.id, a_confirmed = false, b_confirmed = false, status = 'NEGOTIATING' where id = rec.id;
  else
    update public.direct_trades set b_catch = c.id, a_confirmed = false, b_confirmed = false, status = 'NEGOTIATING' where id = rec.id;
  end if;
  return jsonb_build_object('ok', true, 'message', 'Offer updated. Both trainers must confirm again.');
end;
$function$;

create or replace function public.play_direct_trade_confirm(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.direct_trades;
  a public.catches;
  b public.catches;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into rec from public.direct_trades where id = p_id for update;
  if rec.id is null or rec.expires_at < now() or rec.status in ('COMPLETED','CANCELLED','FAILED') then
    raise exception 'That trade is no longer open.';
  end if;
  if uid = rec.a_user then
    update public.direct_trades set a_confirmed = true where id = rec.id;
  elsif uid = rec.b_user then
    update public.direct_trades set b_confirmed = true where id = rec.id;
  else
    raise exception 'That trade is not yours.';
  end if;
  select * into rec from public.direct_trades where id = p_id;
  if not (rec.a_confirmed and rec.b_confirmed and rec.a_catch is not null and rec.b_catch is not null) then
    return jsonb_build_object('ok', true, 'message', 'Waiting for the other trainer to confirm.');
  end if;
  update public.direct_trades set status = 'PROCESSING'
   where id = rec.id and status not in ('PROCESSING','COMPLETED','FAILED','CANCELLED','EXPIRED');
  if not found then
    return jsonb_build_object('ok', true, 'message', 'Trade already processed.');
  end if;
  select * into a from public.catches where id = rec.a_catch and user_id = rec.a_user and transferred_at is null for update;
  select * into b from public.catches where id = rec.b_catch and user_id = rec.b_user and transferred_at is null for update;
  if a.id is null or b.id is null then
    update public.direct_trades set status = 'FAILED' where id = rec.id;
    raise exception 'One of those Pokémon is no longer available.';
  end if;
  update public.catches set user_id = rec.b_user where id = a.id;
  update public.catches set user_id = rec.a_user where id = b.id;
  perform private.pull_from_team(rec.a_user, a.id);
  perform private.pull_from_team(rec.b_user, b.id);
  perform private.mark_trade_receive(rec.b_user, a.id, rec.a_user);
  perform private.mark_trade_receive(rec.a_user, b.id, rec.b_user);
  update public.trainer_stats set trades_done = trades_done + 1, traded_away = traded_away + 1, traded_in = traded_in + 1, updated_at = now()
   where user_id in (rec.a_user, rec.b_user);
  perform private.trade_xp(rec.a_user, 'direct:' || rec.id::text);
  perform private.trade_xp(rec.b_user, 'direct:' || rec.id::text);
  update public.direct_trades set status = 'COMPLETED', completed_at = now() where id = rec.id;
  perform private.evaluate_achievements(rec.a_user, true);
  perform private.evaluate_achievements(rec.b_user, true);
  return jsonb_build_object('ok', true, 'message', 'Trade complete.');
end;
$function$;

create or replace function public.play_direct_trade_cancel(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  update public.direct_trades
     set status = 'CANCELLED'
   where id = p_id and status in ('PENDING','NEGOTIATING') and (a_user = uid or b_user = uid);
  if not found then raise exception 'That trade can no longer be cancelled.'; end if;
  return jsonb_build_object('ok', true, 'message', 'Trade cancelled.');
end;
$function$;

create or replace function public.play_direct_trades()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  update public.direct_trades
     set status = 'EXPIRED'
   where status in ('PENDING','NEGOTIATING') and expires_at < now()
     and (a_user = auth.uid() or b_user = auth.uid());
  return jsonb_build_object('ok', true, 'trades', coalesce((
    select jsonb_agg(to_jsonb(t) order by t.created_at desc)
    from public.direct_trades t
    where t.a_user = auth.uid() or t.b_user = auth.uid()
  ), '[]'::jsonb));
end;
$function$;

grant execute on function public.play_collection() to authenticated;
grant execute on function public.play_evolve(uuid, text) to authenticated;
grant execute on function public.play_set_mon_flags(uuid, boolean, boolean) to authenticated;
grant execute on function public.play_release(uuid, text) to authenticated;
grant execute on function public.play_direct_trade_create(text, uuid) to authenticated;
grant execute on function public.play_direct_trade_set(uuid, uuid) to authenticated;
grant execute on function public.play_direct_trade_confirm(uuid) to authenticated;
grant execute on function public.play_direct_trade_cancel(uuid) to authenticated;
grant execute on function public.play_direct_trades() to authenticated;
