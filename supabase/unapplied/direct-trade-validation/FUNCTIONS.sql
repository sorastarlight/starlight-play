CREATE OR REPLACE FUNCTION public.play_direct_trade_confirm(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if a.id is null or b.id is null or a.locked or a.favorite or b.locked or b.favorite then
    update public.direct_trades set status = 'FAILED' where id = rec.id;
    raise exception 'One of those Pokémon is no longer available.';
  end if;
  if (a.trade_locked_until is not null and a.trade_locked_until > now())
     or (b.trade_locked_until is not null and b.trade_locked_until > now()) then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
  if exists (select 1 from public.species s where s.dex in (a.dex,b.dex) and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
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

CREATE OR REPLACE FUNCTION public.play_direct_trade_create(p_login text, p_catch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if c.trade_locked_until is not null and c.trade_locked_until > now() then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
  if exists (select 1 from public.species s where s.dex = c.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  insert into public.direct_trades (a_user, b_user, a_catch, status, expires_at)
  values (uid, partner, c.id, 'NEGOTIATING', now() + interval '15 minutes')
  returning * into rec;
  return jsonb_build_object('ok', true, 'tradeId', rec.id, 'message', 'Trade request sent.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.play_direct_trade_set(p_id uuid, p_catch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if c.trade_locked_until is not null and c.trade_locked_until > now() then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
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
