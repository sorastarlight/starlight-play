BEGIN;
DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_accept(uuid)'::regprocedure AND md5(prosrc)='389f4c2ff00d0bf1666380bf6059cf09' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'GTS acceptance source or privilege drift'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION public.play_trade_accept(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  o public.trade_offers;
  l public.trade_listings;
  listed public.catches;
  offered public.catches;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into o from public.trade_offers where id = p_offer_id and status = 'pending' for update;
  if o.id is null then raise exception 'That offer is gone.'; end if;
  select * into l from public.trade_listings where id = o.listing_id and user_id = uid and status = 'open' for update;
  if l.id is null then raise exception 'Only the listing trainer can accept, and the listing must still be open.'; end if;
  select * into listed from public.catches where id = l.catch_id and user_id = uid and transferred_at is null for update;
  select * into offered from public.catches where id = o.catch_id and user_id = o.user_id and transferred_at is null for update;
  if listed.id is null or offered.id is null then
    raise exception 'One of those Pokémon is no longer available.';
  end if;
  if listed.locked or listed.favorite or offered.locked or offered.favorite then
    raise exception 'A locked or favorite Pokémon cannot be traded.';
  end if;
  if exists (select 1 from public.species s where s.dex = listed.dex and s.tradable = false)
     or exists (select 1 from public.species s where s.dex = offered.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  if (listed.trade_locked_until is not null and listed.trade_locked_until > now())
     or (offered.trade_locked_until is not null and offered.trade_locked_until > now()) then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
  update public.catches set user_id = o.user_id where id = listed.id;
  update public.catches set user_id = uid where id = offered.id;
  perform private.pull_from_team(uid, listed.id);
  perform private.pull_from_team(o.user_id, offered.id);
  perform private.mark_trade_receive(o.user_id, listed.id, uid);
  perform private.mark_trade_receive(uid, offered.id, o.user_id);
  update public.trainer_stats set trades_done = trades_done + 1, traded_away = traded_away + 1, traded_in = traded_in + 1, updated_at = now() where user_id = uid;
  update public.trainer_stats set trades_done = trades_done + 1, traded_away = traded_away + 1, traded_in = traded_in + 1, updated_at = now() where user_id = o.user_id;
  perform private.trade_xp(uid, 'gts:' || l.id::text);
  perform private.trade_xp(o.user_id, 'gts:' || l.id::text);
  update public.trade_listings set status = 'completed' where id = l.id;
  update public.trade_offers set status = 'accepted' where id = o.id;
  update public.trade_offers set status = 'declined' where listing_id = l.id and status = 'pending';
  update public.trade_listings set status = 'cancelled' where catch_id in (listed.id, offered.id) and status = 'open';
  update public.trade_offers set status = 'declined' where status = 'pending' and catch_id in (listed.id, offered.id);
  perform private.evaluate_achievements(uid, true);
  perform private.evaluate_achievements(o.user_id, true);
  return jsonb_build_object('ok', true, 'message', 'Trade complete. The Pokémon swapped trainers.');
end;
$function$
;
COMMIT;
