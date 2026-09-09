-- Persistent Play console log, shared by the Play page and Admin Hub.

create table if not exists public.play_console_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  round_id uuid references public.encounter_rounds(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text,
  kind text not null,
  item text,
  message text,
  source_activity_id bigint
);

create unique index if not exists play_console_log_activity_uidx
  on public.play_console_log (source_activity_id)
  where source_activity_id is not null;

create index if not exists play_console_log_created_idx
  on public.play_console_log (created_at desc, id desc);

alter table public.play_console_log enable row level security;

drop policy if exists "anyone can read play console" on public.play_console_log;
create policy "anyone can read play console"
  on public.play_console_log for select
  using (true);

grant select on public.play_console_log to anon, authenticated;

create or replace function private.play_console_json(p_limit int default 100)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'name', x.name,
      'kind', x.kind,
      'item', x.item,
      'message', x.message,
      'at', x.at
    ) order by x.at desc, x.id desc),
    '[]'::jsonb
  )
  from (
    select
      l.id,
      l.display_name as name,
      l.kind,
      l.item,
      l.message,
      l.created_at as at
    from public.play_console_log l
    order by l.created_at desc, l.id desc
    limit greatest(coalesce(p_limit, 100), 1)
  ) x;
$$;

create or replace function private.mirror_activity_to_console()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.play_console_log (
    created_at, round_id, user_id, display_name, kind, item, source_activity_id
  ) values (
    coalesce(new.created_at, now()),
    new.round_id,
    new.user_id,
    new.display_name,
    new.kind,
    new.item,
    new.id
  )
  on conflict (source_activity_id) where source_activity_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists encounter_activity_console on public.encounter_activity;
create trigger encounter_activity_console
  after insert on public.encounter_activity
  for each row execute function private.mirror_activity_to_console();

create or replace function private.mirror_round_to_console()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  kind text;
  message text;
begin
  if tg_op = 'INSERT' then
    kind := 'appeared';
    message := coalesce(nullif(btrim(new.name), ''), 'A Pokémon') || ' appeared!';
  elsif new.cancelled and not coalesce(old.cancelled, false) then
    kind := 'cancelled';
    message := 'Encounter cancelled.';
  elsif new.resolved and not coalesce(old.resolved, false) then
    kind := 'resolved';
    message := coalesce(nullif(btrim(new.last_action), ''), 'Results locked in.');
  elsif new.hidden is distinct from old.hidden then
    kind := 'hidden';
    message := case when new.hidden then 'Encounter hidden from viewers.' else 'Encounter shown to viewers.' end;
  else
    return new;
  end if;
  insert into public.play_console_log (round_id, kind, message)
  values (new.id, kind, message);
  return new;
end;
$$;

drop trigger if exists encounter_rounds_console on public.encounter_rounds;
create trigger encounter_rounds_console
  after insert or update of cancelled, resolved, hidden, name on public.encounter_rounds
  for each row execute function private.mirror_round_to_console();

insert into public.play_console_log (
  created_at, round_id, user_id, display_name, kind, item, source_activity_id
)
select a.created_at, a.round_id, a.user_id, a.display_name, a.kind, a.item, a.id
from public.encounter_activity a
where not exists (
  select 1 from public.play_console_log l where l.source_activity_id = a.id
);

create or replace function public.play_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return coalesce(private.play_snapshot(auth.uid()), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100));
end;
$$;

create or replace function public.play_sync()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return coalesce(private.play_snapshot(auth.uid()), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100));
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  return coalesce(private.admin_overview(), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(250));
end;
$$;

grant execute on function public.play_state() to anon, authenticated;
grant execute on function public.play_sync() to anon, authenticated;
grant execute on function public.admin_overview() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.play_console_log;
exception
  when duplicate_object then null;
end $$;

create or replace function private.play_snapshot(p_uid uuid)
returns jsonb
language plpgsql
as $$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  is_admin boolean;
  staff_role text;
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', inv.lure_armed
    ) || coalesce(inv.balls, '{}'::jsonb);
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at)
      into pass from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  if r is not null and (not r.hidden or is_admin) then
    visible := private.public_round_json(r);
  end if;
  return jsonb_build_object(
    'round', visible,
    'me', me,
    'bag', bag,
    'pass', pass,
    'trainer', private.trainer_card(p_uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
    'isAdmin', is_admin,
    'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner',
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'ballChances', settings->'ballChances',
      'berryBonus', settings->'berryBonus',
      'maxBaitBonus', settings->'maxBaitBonus',
      'maxCatchChance', settings->'maxCatchChance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'bitsCatalogEnabled', true,
    'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$$;
