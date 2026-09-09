-- GTS: optional wanted gender and shiny on listings.

alter table public.trade_listings
  add column if not exists want_gender text,
  add column if not exists want_shiny boolean not null default false;

alter table public.trade_listings
  drop constraint if exists trade_listings_want_gender_check;

alter table public.trade_listings
  add constraint trade_listings_want_gender_check
  check (want_gender is null or want_gender in ('Male', 'Female'));

create or replace function private.trade_listing_json(l public.trade_listings)
returns jsonb
language plpgsql
stable
as $$
declare
  c public.catches;
  trainer public.profiles;
  offers int;
begin
  select * into c from public.catches where id = l.catch_id;
  select * into trainer from public.profiles where id = l.user_id;
  select count(*)::int into offers from public.trade_offers o where o.listing_id = l.id and o.status = 'pending';
  return jsonb_build_object(
    'id', l.id,
    'createdAt', l.created_at,
    'status', l.status,
    'wantDex', l.want_dex,
    'wantGender', l.want_gender,
    'wantShiny', coalesce(l.want_shiny, false),
    'acceptAny', coalesce(l.accept_any, true),
    'note', l.note,
    'offers', offers,
    'mine', auth.uid() is not null and l.user_id = auth.uid(),
    'trainer', jsonb_build_object(
      'login', trainer.twitch_login,
      'displayName', coalesce(nullif(trainer.display_name, ''), trainer.twitch_login, 'Trainer'),
      'avatar', trainer.avatar_url,
      'sprite', trainer.trainer_sprite
    ),
    'mon', private.catch_json(c)
  );
end;
$$;

drop function if exists public.play_trade_create(uuid, int, text, boolean);

create or replace function public.play_trade_create(
  p_catch_id uuid,
  p_want_dex int default null,
  p_note text default null,
  p_accept_any boolean default true,
  p_want_gender text default null,
  p_want_shiny boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  c public.catches;
  listing public.trade_listings;
  note text := left(btrim(coalesce(p_note, '')), 80);
  accept boolean := coalesce(p_accept_any, true);
  want_gender text := nullif(p_want_gender, '');
  want_shiny boolean := coalesce(p_want_shiny, false);
  rate int;
begin
  if uid is null then
    raise exception 'Sign in to list a Pokémon for trade.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if p_want_dex is not null and (p_want_dex < 1 or p_want_dex > 151) then
    raise exception 'Wanted Pokémon must be from the Kanto Pokédex.';
  end if;
  if p_want_dex is null then
    accept := true;
    want_gender := null;
    want_shiny := false;
  else
    rate := private.lgpe_gender_rate(p_want_dex);
    if rate is null or rate = -1 or rate = 0 or rate = 8 then
      want_gender := null;
    elsif want_gender is not null and want_gender not in ('Male', 'Female') then
      want_gender := null;
    end if;
  end if;
  if p_want_dex is null and accept is not true then
    raise exception 'Choose a Pokémon you want, or take other offers.';
  end if;
  perform private.pull_from_team(uid, c.id);
  insert into public.trade_listings (catch_id, user_id, want_dex, note, accept_any, want_gender, want_shiny)
  values (c.id, uid, p_want_dex, nullif(note, ''), accept, want_gender, want_shiny)
  on conflict (catch_id) do update
    set status = 'open',
        want_dex = excluded.want_dex,
        note = excluded.note,
        accept_any = excluded.accept_any,
        want_gender = excluded.want_gender,
        want_shiny = excluded.want_shiny,
        user_id = uid,
        created_at = now()
    where public.trade_listings.status <> 'open'
  returning * into listing;
  if listing.id is null then
    raise exception 'That Pokémon is already on the trade board.';
  end if;
  return jsonb_build_object('ok', true, 'message', 'Listed on the Global Trade System.', 'listing', private.trade_listing_json(listing));
end;
$$;

create or replace function public.play_trade_offer(p_listing_id uuid, p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  l public.trade_listings;
  c public.catches;
begin
  if uid is null then
    raise exception 'Sign in to make an offer.' using errcode = '42501';
  end if;
  select * into l from public.trade_listings where id = p_listing_id and status = 'open';
  if l.id is null then
    raise exception 'That listing is no longer open.';
  end if;
  if l.user_id = uid then
    raise exception 'You cannot offer on your own listing.';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take that Pokémon off the trade board before offering it.';
  end if;
  if l.want_dex is not null and coalesce(l.accept_any, true) = false then
    if c.dex is distinct from l.want_dex then
      raise exception 'This trainer is only looking for that species.';
    end if;
    if l.want_gender in ('Male', 'Female') and c.gender is distinct from l.want_gender then
      raise exception 'This trainer wants that gender.';
    end if;
    if coalesce(l.want_shiny, false) and position('shiny' in lower(coalesce(c.variant, ''))) = 0 then
      raise exception 'This trainer wants a shiny.';
    end if;
  end if;
  perform private.pull_from_team(uid, c.id);
  insert into public.trade_offers (listing_id, user_id, catch_id)
  values (l.id, uid, c.id);
  return jsonb_build_object('ok', true, 'message', 'Offer sent.');
end;
$$;

grant execute on function public.play_trade_create(uuid, int, text, boolean, text, boolean) to authenticated;
grant execute on function public.play_trade_offer(uuid, uuid) to authenticated;
