-- Read-only staff contract enrichment; exact installed baseline guard.
do $guard$ begin
if md5(pg_get_functiondef('private.admin_account_json(uuid)'::regprocedure)) <> 'db3293691adb2e71444088317a3cb9b7' then raise exception 'admin_account_json drift; inspect before installation'; end if;
end $guard$;
create or replace function private.admin_catch_battle_json(c public.catches)
returns jsonb language sql stable
set search_path = pg_catalog, public, private
as $battle$
select jsonb_build_object(
 'ivs', jsonb_build_object('hp', c.iv_hp, 'atk', c.iv_atk, 'def', c.iv_def, 'spa', c.iv_spa, 'spd', c.iv_spd, 'spe', c.iv_spe),
 'evs', jsonb_build_object('hp', c.ev_hp, 'atk', c.ev_atk, 'def', c.ev_def, 'spa', c.ev_spa, 'spd', c.ev_spd, 'spe', c.ev_spe),
 'avs', jsonb_build_object('hp', c.av_hp, 'atk', c.av_atk, 'def', c.av_def, 'spa', c.av_spa, 'spd', c.av_spd, 'spe', c.av_spe),
 'hpCurrent', c.hp_current, 'hpMax', c.hp_max,
 'nature', (select n.name from private.ref_natures n where n.content_build=c.content_build and n.id=c.nature_id),
 'ability', (select initcap(replace(a.slug,'-',' ')) from private.ref_abilities a where a.content_build=c.content_build and a.ability_id=c.ability_id),
 'moves', case when c.move_slots is not null then
   (select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(x.slot->>'name',''),initcap(replace(m.slug,'-',' ')))) order by x.position), '[]'::jsonb)
    from jsonb_array_elements(c.move_slots) with ordinality x(slot,position)
    left join private.ref_moves m on m.content_build=c.content_build and m.move_id::text=x.slot->>'moveId')
   else to_jsonb(c.moves) end
);
$battle$;
revoke all on function private.admin_catch_battle_json(public.catches) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.admin_account_json(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p public.profiles%rowtype;
  inv public.inventories;
  bag jsonb;
  mons jsonb;
  conns jsonb;
  candy jsonb;
  primary_login text;
  gameplay_n int := 0;
  bot_n int := 0;
begin
  select * into p from public.profiles where id = p_user;
  if p.id is null then raise exception 'No Play account for that trainer.'; end if;
  select * into inv from public.inventories where user_id = p_user;
  if inv.user_id is null then
    bag := jsonb_build_object('berry', 0, 'bait', 0, 'pokeball', 0, 'greatball', 0, 'ultraball', 0, 'lure', 0, 'coins', 0, 'bag_bonus', 0, 'capacity', 50, 'used', 0);
  else
    bag := jsonb_build_object('berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball, 'greatball', inv.greatball, 'ultraball', inv.ultraball, 'lure', inv.lure, 'coins', inv.coins, 'bag_bonus', inv.bag_bonus, 'capacity', private.bag_capacity(p_user), 'used', private.item_total(inv)) || private.merge_inventory_layers(inv);
  end if;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into mons from (
    select c.id, c.dex, c.name, c.nickname, c.variant, c.gender, c.ball, c.level, c.caught_at as "caughtAt", private.admin_catch_battle_json(c) as "battleData" from public.catches c where c.user_id = p_user and c.transferred_at is null order by c.caught_at desc limit 40
  ) x;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'twitchUserId', c.twitch_user_id, 'login', c.twitch_login, 'displayName', c.twitch_display_name, 'avatar', c.avatar_url, 'primary', c.is_primary, 'gameplayEnabled', c.gameplay_enabled, 'loginEnabled', c.login_enabled, 'type', c.connection_type, 'status', c.authorization_status, 'confirmed', c.confirmed, 'linkedAt', c.linked_at, 'lastVerifiedAt', c.last_verified_at) order by c.is_primary desc, c.linked_at), '[]'::jsonb) into conns from public.twitch_connections c where c.user_id = p_user;
  select coalesce(jsonb_agg(jsonb_build_object('familyId', f.id, 'name', f.name, 'baseDex', f.base_dex, 'qty', coalesce(c.qty, 0), 'members', coalesce((select jsonb_agg(x.name order by x.dex) from (select distinct on (s.dex) s.dex, s.name from public.species s where s.dex between 1 and 151 and (s.family_id = f.id or coalesce(s.family_candy_species_id, 0) = f.id or s.dex = f.base_dex) order by s.dex) x), '[]'::jsonb)) order by f.id), '[]'::jsonb) into candy from public.evolution_families f left join public.family_candy c on c.user_id = p_user and c.family_id = f.id where f.id between 1 and 151;
  select c.twitch_login into primary_login from public.twitch_connections c where c.user_id = p_user and c.confirmed and c.is_primary limit 1;
  select count(*)::int into gameplay_n from public.twitch_connections c where c.user_id = p_user and c.confirmed and c.gameplay_enabled;
  select count(*)::int into bot_n from public.twitch_connections c where c.user_id = p_user and c.confirmed and c.connection_type in ('bot', 'utility');
  return jsonb_build_object('ok', true, 'user', jsonb_build_object('id', p.id, 'username', p.username, 'login', coalesce(primary_login, p.twitch_login), 'displayName', coalesce(nullif(p.display_name, ''), p.username, p.twitch_login, 'Trainer'), 'avatar', p.avatar_url, 'role', coalesce(private.play_staff_role(p.id), 'player'), 'pass', p.starlight_pass, 'createdAt', p.created_at, 'lastSeenAt', p.last_seen_at, 'emailLogin', private.profile_has_password(p.id)), 'health', jsonb_build_object('primaryTwitch', primary_login, 'linkedTwitch', coalesce(jsonb_array_length(conns), 0), 'gameplayTwitch', gameplay_n, 'botTwitch', bot_n), 'bagSource', jsonb_build_object('ballsMasterball', coalesce((inv.balls->>'masterball')::int, 0), 'itemsMasterball', coalesce((inv.items->>'masterball')::int, 0), 'displayMasterball', coalesce((bag->>'masterball')::int, 0)), 'connections', conns, 'bag', bag, 'candy', candy, 'mons', mons, 'staffRole', private.play_staff_role(), 'canEdit', coalesce(private.play_staff_role(), '') in ('owner', 'admin'), 'ownerTools', private.play_staff_role() = 'owner');
end;
$function$
