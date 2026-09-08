alter table public.profiles
  add column if not exists card_bg text not null default 'hoenn';

create or replace function private.card_bg_ok(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') in (
    'kanto', 'johto', 'hoenn', 'sinnoh', 'unova',
    'kalos', 'alola', 'galar', 'hisui', 'paldea'
  );
$$;

create or replace function private.trainer_card(p_uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  p public.profiles%rowtype;
  lvl int;
  caught int;
  species int;
  into_xp int;
  need int;
  coins int := 0;
begin
  if p_uid is null then
    return null;
  end if;
  select * into p from public.profiles where id = p_uid;
  if p.id is null then
    return null;
  end if;
  lvl := private.trainer_level(p.xp);
  into_xp := p.xp - (25 * (lvl - 1) * (lvl - 1));
  need := 25 * (2 * lvl - 1);
  select count(*)::int, count(distinct dex)::int
    into caught, species
    from public.catches
    where user_id = p_uid;
  select coalesce(i.coins, 0) into coins
    from public.inventories i
    where i.user_id = p_uid;
  return jsonb_build_object(
    'id', p.id,
    'login', p.twitch_login,
    'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case
      when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite
      else 'red-gen1'
    end,
    'cardBg', case
      when private.card_bg_ok(p.card_bg) then p.card_bg
      else 'hoenn'
    end,
    'idNo', 10000 + (abs(hashtext(p.id::text)) % 90000),
    'startedAt', p.created_at,
    'coins', coalesce(coins, 0),
    'level', lvl,
    'xp', p.xp,
    'xpInto', greatest(0, into_xp),
    'xpNeed', greatest(1, need),
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'pass', p.starlight_pass,
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'title', coalesce(p.trainer_title, ''),
    'team', private.team_mons(p_uid),
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
  );
end;
$$;

create or replace function public.play_set_card_bg(p_bg text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  bg text := btrim(coalesce(p_bg, ''));
begin
  if uid is null then
    raise exception 'Sign in to choose a card background.' using errcode = '42501';
  end if;
  if not private.card_bg_ok(bg) then
    raise exception 'That card background is not available.';
  end if;
  update public.profiles
    set card_bg = bg, updated_at = now()
    where id = uid;
  return jsonb_build_object(
    'ok', true,
    'message', 'Card background saved.',
    'trainer', private.trainer_card(uid)
  );
end;
$$;

grant execute on function public.play_set_card_bg(text) to authenticated;
