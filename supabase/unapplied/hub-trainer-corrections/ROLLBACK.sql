do $guard$ begin
if md5(pg_get_functiondef('private.assert_catch_tradable()'::regprocedure)) is distinct from '4710df6bb03ff5ae30e732718bcebb45' then raise exception 'Correction rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_remove_pokemon(uuid,uuid)'::regprocedure)) is distinct from 'ba70caf795670a7fc3d4332fcb5c1b61' then raise exception 'Correction rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_set_coins(uuid,integer)'::regprocedure)) is distinct from '4639bc72fbcd0e10edf5df462480e920' then raise exception 'Correction rollback source drift';end if;
end $guard$;
CREATE OR REPLACE FUNCTION private.assert_catch_tradable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  c public.catches;
begin
  select * into c from public.catches where id = new.catch_id;
  if c.id is null then raise exception 'That Pokémon is not available.'; end if;
  if c.locked or c.favorite then raise exception 'A locked or favorite Pokémon cannot be traded.'; end if;
  if exists (select 1 from public.species s where s.dex = c.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  if c.trade_locked_until is not null and c.trade_locked_until > now() then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_remove_pokemon(p_user uuid, p_catch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.catches%rowtype;
begin
  perform private.require_staff_edit();
  select * into c from public.catches where id = p_catch_id and user_id = p_user;
  if c.id is null or c.transferred_at is not null then raise exception 'That Pokémon is not in this trainer''s PC.'; end if;
  update public.trade_listings set status = 'cancelled' where catch_id = c.id and status = 'open';
  update public.trade_offers set status = 'withdrawn' where catch_id = c.id and status = 'pending';
  perform private.pull_from_team(p_user, c.id);
  update public.catches set transferred_at = now() where id = c.id;
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Pokémon removed from their PC.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_coins(p_user uuid, p_coins integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare before_bal int; target int := greatest(0, coalesce(p_coins,0));
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  perform private.ensure_inventory(p_user);
  select coins into before_bal from public.inventories where user_id = p_user;
  perform private.adjust_coins(p_user, target - coalesce(before_bal,0), 'ADMIN_ADJUSTMENT', 'Admin set balance', jsonb_build_object('relatedItem','coins'));
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'PokéCoins set.');
end;
$function$
;
drop trigger hub_direct_trade_hold on public.direct_trades;
revoke execute on function public.admin_trainer_corrections_read(uuid),public.admin_trainer_correction_write(jsonb) from public,anon,authenticated;
-- Retain private correction archives, receipts and soft-removed specimens. No player data is reversed automatically.
