-- Phase 8: authoritative Bits fulfillment, health, Studio validation, draft packs.

alter table private.bits_events
  add column if not exists twitch_user_id text,
  add column if not exists bits int not null default 0,
  add column if not exists title text not null default '',
  add column if not exists status text not null default 'received',
  add column if not exists trainer_id uuid,
  add column if not exists grants jsonb not null default '{}'::jsonb,
  add column if not exists pack_name text not null default '',
  add column if not exists anonymous boolean not null default false;

alter table private.bits_pending
  add column if not exists twitch_user_id text,
  add column if not exists bits int not null default 0,
  add column if not exists title text not null default '';

alter table private.stream_bridge
  add column if not exists last_support_alert jsonb;

create table if not exists private.bits_support_totals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bits_total int not null default 0,
  updated_at timestamptz not null default now()
);
alter table private.bits_support_totals enable row level security;

create or replace function private.bits_title_key(p_title text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(btrim(coalesce(p_title, ''))), '[''`´]', '', 'g');
$$;

create or replace function private.bits_live_products()
returns table(sku text, name text, bits int, grants jsonb, titles jsonb, blurb text, sprite text)
language sql
stable
as $$
  select i.sku, i.name, i.bits, i.grants, coalesce(i.extra->'bitsTitles', '[]'::jsonb), i.blurb, coalesce(nullif(i.sprite, ''), i.thumb, 'amulet-coin.png')
  from private.store_items i
  join private.store_categories c on c.id = i.category_id
  where c.kind = 'bits' and private.store_item_is_live(i);
$$;

create or replace function private.bits_match(p_title text, p_bits int)
returns jsonb
language plpgsql
stable
as $$
declare
  title text := private.bits_title_key(p_title);
  hits jsonb := '[]'::jsonb;
  by_bits jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('sku', p.sku, 'name', p.name, 'bits', p.bits) order by p.sku), '[]'::jsonb)
    into hits
  from private.bits_live_products() p
  where title <> ''
    and (
      lower(p.name) = title
      or exists (select 1 from jsonb_array_elements_text(p.titles) t where private.bits_title_key(t) = title)
    );
  if jsonb_array_length(hits) = 1 then
    return jsonb_build_object('sku', hits->0->>'sku', 'reason', 'title', 'collision', false, 'matches', hits);
  end if;
  if jsonb_array_length(hits) > 1 then
    return jsonb_build_object('sku', null, 'reason', 'title_collision', 'collision', true, 'matches', hits);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('sku', p.sku, 'name', p.name, 'bits', p.bits) order by p.sku), '[]'::jsonb)
    into by_bits
  from private.bits_live_products() p
  where p.bits = coalesce(p_bits, 0) and coalesce(p_bits, 0) > 0;
  if jsonb_array_length(by_bits) = 1 then
    return jsonb_build_object('sku', by_bits->0->>'sku', 'reason', 'bits_amount', 'collision', false, 'matches', by_bits);
  end if;
  if jsonb_array_length(by_bits) > 1 then
    return jsonb_build_object('sku', null, 'reason', 'amount_collision', 'collision', true, 'matches', by_bits);
  end if;
  return jsonb_build_object('sku', null, 'reason', 'unmatched', 'collision', false, 'matches', '[]'::jsonb);
end;
$$;

create or replace function private.bits_sku(p_title text, p_bits int)
returns text
language sql
stable
as $$
  select private.bits_match(p_title, p_bits)->>'sku';
$$;

create or replace function private.bits_amount_collisions()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('bits', bits, 'skus', skus) order by bits), '[]'::jsonb)
  from (
    select p.bits, jsonb_agg(p.sku order by p.sku) as skus
    from private.bits_live_products() p
    group by p.bits
    having count(*) > 1
  ) x;
$$;

create or replace function private.public_support_alert()
returns jsonb
language sql
stable
as $$
  select case
    when b.last_support_alert is null then null
    when coalesce((b.last_support_alert->>'at')::timestamptz, b.last_bits_at) < now() - interval '45 seconds' then null
    else jsonb_build_object(
      'displayName', b.last_support_alert->>'displayName',
      'packName', b.last_support_alert->>'packName',
      'bits', (b.last_support_alert->>'bits')::int,
      'contents', b.last_support_alert->'contents',
      'at', b.last_support_alert->>'at',
      'anonymous', coalesce((b.last_support_alert->>'anonymous')::boolean, false)
    )
  end
  from private.stream_bridge b
  where b.id = 1;
$$;

create or replace function private.bits_validate_grants(p_grants jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  k text;
begin
  perform private.validate_store_grants(coalesce(p_grants, '{}'::jsonb));
  if coalesce(p_grants, '{}'::jsonb) ? 'pokemon' or coalesce(p_grants, '{}'::jsonb) ? 'shiny'
     or coalesce(p_grants, '{}'::jsonb) ? 'dex' or coalesce(p_grants, '{}'::jsonb) ? 'spawnBoost' then
    raise exception 'Bits products cannot grant Pokémon, Shinies, or spawn boosts.';
  end if;
  for k in select jsonb_object_keys(coalesce(p_grants, '{}'::jsonb))
  loop
    if k ~* 'shiny|pokemon|pokedex|masterball|odds|random|chance' then
      raise exception 'Bits products cannot include %', k;
    end if;
  end loop;
  if not exists (select 1 from jsonb_each_text(coalesce(p_grants, '{}'::jsonb)) e where greatest(coalesce(e.value::int, 0), 0) > 0) then
    raise exception 'Bits products need guaranteed contents.';
  end if;
  return p_grants;
end;
$$;

create or replace function public.credit_bits_from_twitch(
  p_event_id text,
  p_login text,
  p_title text,
  p_bits int,
  p_twitch_user_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  login text := lower(btrim(coalesce(p_login, '')));
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  matched jsonb;
  sku text;
  item jsonb;
  trainer uuid;
  inserted text;
  note text;
  anon boolean := (login = '' and ident = '');
  st text := 'received';
  pack text := '';
  contents jsonb := '{}'::jsonb;
begin
  if btrim(coalesce(p_event_id, '')) = '' then
    raise exception 'Missing Bits event id.';
  end if;
  matched := private.bits_match(p_title, p_bits);
  sku := matched->>'sku';
  insert into private.bits_events (
    event_id, twitch_login, twitch_user_id, sku, granted, detail, bits, title, status, anonymous
  ) values (
    p_event_id, login, nullif(ident, ''), coalesce(sku, ''), false, '', coalesce(p_bits, 0), coalesce(p_title, ''), 'received', anon
  )
  on conflict (event_id) do nothing
  returning event_id into inserted;
  if inserted is null then
    update private.stream_bridge set last_bits_at = now() where id = 1;
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'duplicate', 'message', 'Already credited.');
  end if;
  if coalesce((matched->>'collision')::boolean, false) then
    note := 'Ambiguous Power-Up mapping for "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits).';
    update private.bits_events set status = 'ignored', detail = note where event_id = p_event_id;
    update private.stream_bridge set last_bits_at = now(), last_bits_detail = note where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'status', 'ignored', 'collision', true, 'message', note, 'matches', matched->'matches');
  end if;
  if sku is null then
    note := 'General Power-Up "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits) did not match a live Store product.';
    update private.bits_events set status = 'ignored', detail = note where event_id = p_event_id;
    update private.stream_bridge set last_bits_at = now(), last_bits_detail = note where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'status', 'ignored', 'general', true, 'message', note);
  end if;
  select elem into item
    from jsonb_array_elements(private.store_catalog()->'bits') as elem
   where elem->>'sku' = sku;
  if item is null then
    note := 'Unknown Bits pack.';
    update private.bits_events set status = 'failed', detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'status', 'failed', 'message', note);
  end if;
  pack := coalesce(item->>'name', sku);
  contents := coalesce(item->'grants', '{}'::jsonb);
  if anon then
    note := 'Twitch did not send a viewer identity.';
    update private.bits_events set status = 'unresolved', detail = note, pack_name = pack, grants = contents where event_id = p_event_id;
    update private.stream_bridge set last_bits_at = now(), last_bits_detail = note where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'status', 'unresolved', 'anonymous', true, 'message', note);
  end if;
  trainer := private.find_trainer(ident, login, true);
  if trainer is null then
    trainer := private.find_trainer(ident, login, false);
    if trainer is not null then
      note := 'Skipped Bits grant. That Twitch identity is linked as a bot or utility account.';
      update private.bits_events set status = 'skipped_bot', detail = note, trainer_id = trainer, pack_name = pack, grants = contents where event_id = p_event_id;
      return jsonb_build_object('ok', true, 'granted', false, 'skipped', true, 'status', 'skipped_bot', 'message', note);
    end if;
    insert into private.bits_pending (event_id, twitch_login, sku, twitch_user_id, bits, title)
    values (p_event_id, coalesce(nullif(login, ''), ident), sku, nullif(ident, ''), coalesce(p_bits, 0), coalesce(p_title, ''))
    on conflict (event_id) do nothing;
    note := pack || ' is waiting. That viewer needs to sign into Play once.';
    update private.bits_events set status = 'pending', detail = note, pack_name = pack, grants = contents where event_id = p_event_id;
    update private.stream_bridge set last_bits_at = now(), last_bits_detail = note where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'status', 'pending', 'sku', sku, 'message', note);
  end if;
  begin
    perform private.grant_items(trainer, contents, 'BITS_REWARD', sku, 'bits:' || p_event_id, true);
    insert into public.trainer_notices (user_id, kind, title, body, payload)
    values (
      trainer, 'support', 'THANK YOU! ★',
      pack || ' added to your bag.',
      jsonb_build_object(
        'type', 'support', 'sku', sku, 'name', pack, 'bits', coalesce(p_bits, 0),
        'grants', contents, 'eventId', p_event_id, 'displayName', coalesce(nullif(login, ''), 'a supporter')
      )
    );
    insert into private.bits_support_totals (user_id, bits_total, updated_at)
    values (trainer, greatest(coalesce(p_bits, 0), 0), now())
    on conflict (user_id) do update set bits_total = private.bits_support_totals.bits_total + excluded.bits_total, updated_at = now();
    note := 'Granted ' || pack || ' to ' || coalesce(nullif(login, ''), ident) || '.';
    update private.bits_events
       set granted = true, status = 'fulfilled', detail = note, trainer_id = trainer, pack_name = pack, grants = contents
     where event_id = p_event_id;
    update private.stream_bridge
       set last_bits_at = now(),
           last_bits_detail = note,
           last_support_alert = jsonb_build_object(
             'displayName', coalesce(nullif(login, ''), 'a supporter'),
             'packName', pack,
             'bits', coalesce(p_bits, 0),
             'contents', contents,
             'at', now(),
             'anonymous', false
           )
     where id = 1;
    return jsonb_build_object('ok', true, 'granted', true, 'status', 'fulfilled', 'sku', sku, 'message', note);
  exception when others then
    insert into private.bits_pending (event_id, twitch_login, sku, twitch_user_id, bits, title)
    values (p_event_id, coalesce(nullif(login, ''), ident), sku, nullif(ident, ''), coalesce(p_bits, 0), coalesce(p_title, ''))
    on conflict (event_id) do nothing;
    note := sqlerrm;
    update private.bits_events set status = 'failed', detail = note, trainer_id = trainer, pack_name = pack, grants = contents where event_id = p_event_id;
    update private.stream_bridge set last_bits_at = now(), last_bits_detail = note where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'status', 'failed', 'sku', sku, 'message', note);
  end;
end;
$function$;

revoke all on function public.credit_bits_from_twitch(text, text, text, int, text) from public, anon, authenticated;
grant execute on function public.credit_bits_from_twitch(text, text, text, int, text) to service_role;
grant execute on function public.credit_bits_from_twitch(text, text, text, int) to service_role;
