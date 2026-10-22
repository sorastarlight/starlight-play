BEGIN;
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_cancel(uuid)'::regprocedure AND md5(prosrc)='785f93f502d760f763cac2ec65bccf7d' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Trade packet source/attribute drift: play_trade_cancel';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_decline(uuid)'::regprocedure AND md5(prosrc)='e4c850d44e3fff1b1c4c9a184fd7268f' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Trade packet source/attribute drift: play_trade_decline';END IF;
END; $guard$;
CREATE OR REPLACE FUNCTION public.play_trade_cancel(p_listing_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); l public.trade_listings;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into l from public.trade_listings where id = p_listing_id and user_id = uid and status = 'open';
  if l.id is null then raise exception 'That listing is not yours, or it is no longer open.'; end if;
  update public.trade_listings set status = 'cancelled' where id = l.id and user_id = uid and status = 'open';
  if not found then raise exception 'That listing is not yours, or it is no longer open.'; end if;
  update public.trade_offers set status = 'declined' where listing_id = l.id and status = 'pending';
  return jsonb_build_object('ok', true, 'message', 'Listing taken down.');
end;
$function$;
CREATE OR REPLACE FUNCTION public.play_trade_decline(p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.trade_offers; l public.trade_listings;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into o from public.trade_offers where id = p_offer_id and status = 'pending';
  if o.id is null then raise exception 'That offer is gone.'; end if;
  select * into l from public.trade_listings where id = o.listing_id and user_id = auth.uid();
  if l.id is null then raise exception 'Only the listing trainer can decline that offer.'; end if;
  update public.trade_offers set status = 'declined' where id = o.id and status = 'pending';
  if not found then raise exception 'That offer is gone.'; end if;
  return jsonb_build_object('ok', true, 'message', 'Offer declined.');
end;
$function$;
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_cancel(uuid)'::regprocedure AND md5(prosrc)='7ff854362261ec3181b399df5902240b' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Trade packet source/attribute drift: play_trade_cancel';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_trade_decline(uuid)'::regprocedure AND md5(prosrc)='c3377551a8c760c2961c2ece73053ed3' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Trade packet source/attribute drift: play_trade_decline';END IF;
END; $guard$;
COMMIT;
