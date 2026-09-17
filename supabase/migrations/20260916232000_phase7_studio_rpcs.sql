-- Phase 7 Content Studio RPCs, live catalog filter, pack safety, pass rewards.

create or replace function private.store_item_json(i private.store_items)
returns jsonb
language sql
stable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'sku', i.sku,
    'name', i.name,
    'blurb', i.blurb,
    'detail', nullif(i.extra->>'detail', ''),
    'cost', i.cost,
    'bits', nullif(i.bits, 0),
    'grants', i.grants,
    'sprite', nullif(i.sprite, ''),
    'thumb', nullif(i.thumb, ''),
    'featured', i.featured,
    'status', coalesce(nullif(i.status, ''), coalesce(nullif(i.extra->>'status', ''), 'published')),
    'productKind', coalesce(nullif(i.extra->>'productKind', ''),
      case
        when nullif(i.extra->>'pack', '') is not null then 'avatar'
        when i.bits > 0 then 'bits'
        when (select count(*) from jsonb_object_keys(coalesce(i.grants, '{}'::jsonb))) > 1 then 'pack'
        else 'item'
      end),
    'pack', nullif(i.extra->>'pack', ''),
    'looks', i.extra->'looks',
    'bitsTitles', i.extra->'bitsTitles',
    'ballKey', nullif(i.extra->>'ballKey', ''),
    'qty', coalesce(nullif((i.grants->>coalesce(nullif(i.extra->>'ballKey', ''), '') )::int, 0), 1),
    'identity', private.item_identity(coalesce(nullif(i.extra->>'ballKey', ''), (select k from jsonb_object_keys(coalesce(i.grants,'{}'::jsonb)) k limit 1)))
  ));
$$;

create or replace function private.store_floors()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(floor order by sort), '[]'::jsonb)
  from (
    select
      c.sort,
      jsonb_build_object(
        'id', c.id, 'key', c.key, 'name', c.name, 'blurb', c.blurb,
        'icon', c.icon, 'kind', c.kind, 'system', c.system, 'extra', c.extra,
        'items', coalesce((
          select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
          from private.store_items i
          where i.category_id = c.id and private.store_item_is_live(i)
        ), '[]'::jsonb)
      ) as floor
    from private.store_categories c
    where c.visible
  ) x;
$$;

create or replace function private.store_sku_item(p_sku text)
returns jsonb
language sql
stable
as $$
  select private.store_item_json(i)
  from private.store_items i
  where i.sku = p_sku and private.store_item_is_live(i)
  limit 1;
$$;

create or replace function private.store_catalog()
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant exactly the items listed. Catch chance is never sold. Packs are guaranteed contents, never random.',
    'coins', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'coins' and private.store_item_is_live(i) and c.visible
    ), '[]'::jsonb),
    'balls', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'balls' and private.store_item_is_live(i) and c.visible
    ), '[]'::jsonb),
    'bits', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'bits' and private.store_item_is_live(i) and c.visible
    ), '[]'::jsonb),
    'floors', private.store_floors()
  );
$function$;

create or replace function private.validate_store_grants(p_grants jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  k text;
  n int;
  allowed text[];
begin
  if p_grants is null or jsonb_typeof(p_grants) <> 'object' then
    raise exception 'Pack contents must be a list of known items.';
  end if;
  if p_grants ? 'odds' or p_grants ? 'random' or p_grants ? 'chance' then
    raise exception 'Paid packs cannot include random odds.';
  end if;
  allowed := array['berry','bait','pokeball','greatball','ultraball','lure','coins','bag_bonus']
    || private.evo_item_keys()
    || private.extra_ball_keys()
    || private.capture_berry_keys();
  for k, n in select key, greatest(coalesce((value #>> '{}')::int, 0), 0) from jsonb_each(p_grants)
  loop
    if n < 1 then continue; end if;
    if k = 'masterball' then
      raise exception 'The Master Ball cannot be sold in a pack.';
    end if;
    if not (k = any (allowed)) then
      raise exception 'Unknown pack item: %', k;
    end if;
  end loop;
  return p_grants;
end;
$$;

create or replace function public.admin_content_studio()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cat jsonb;
begin
  perform private.require_staff_edit();
  cat := public.admin_store_get();
  return cat || jsonb_build_object(
    'overview', jsonb_build_object(
      'products', (select count(*)::int from private.store_items),
      'live', (select count(*)::int from private.store_items i where private.store_item_is_live(i)),
      'draft', (select count(*)::int from private.store_items where coalesce(status, extra->>'status', 'published') = 'draft'),
      'coinProducts', (select count(*)::int from private.store_items i join private.store_categories c on c.id=i.category_id where c.kind <> 'bits' and i.bits = 0),
      'bitsProducts', (select count(*)::int from private.store_items where bits > 0),
      'packs', (select count(*)::int from private.store_items where coalesce(extra->>'productKind','') = 'pack' or (jsonb_typeof(grants)='object' and (select count(*) from jsonb_object_keys(grants)) > 1)),
      'items', (select count(*)::int from public.capture_balls) + (select count(*)::int from public.capture_berries),
      'avatars', (select count(*)::int from private.trainer_looks),
      'missingPortraits', (select count(*)::int from private.trainer_looks where visible and coalesce(portrait_file,'') = ''),
      'invalid', (select count(*)::int from private.store_items i where i.visible and (coalesce(i.cost,0) < 0 or coalesce(i.bits,0) < 0 or (i.cost > 0 and i.bits > 0)))
    ),
    'passRewards', jsonb_build_object(
      'daily', private.pass_reward_grants('daily'),
      'weekly', private.pass_reward_grants('weekly')
    )
  );
end;
$$;

create or replace function public.admin_item_library(p_q text default null, p_category text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_q, '')));
  cat text := lower(btrim(coalesce(p_category, '')));
begin
  perform private.require_staff_edit();
  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(row order by row->>'category', row->>'name')
      from (
        select private.item_identity(b.key) || jsonb_build_object('icon', coalesce(b.image, b.key), 'sku', (
          select i.sku from private.store_items i where i.extra->>'ballKey' = b.key or i.grants ? b.key limit 1
        )) as row
        from public.capture_balls b
        union all
        select private.item_identity(r.key) || jsonb_build_object('icon', coalesce(r.sprite, r.key))
        from public.capture_berries r
        union all
        select private.item_identity(k) || jsonb_build_object('icon', k)
        from unnest(array['bait','lure','rarecandy','firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord']) k
      ) x
      where (cat = '' or x.row->>'category' = cat)
        and (q = '' or x.row->>'name' ilike '%'||q||'%' or x.row->>'key' ilike '%'||q||'%')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_content_picker(p_q text default null, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_q, '')));
  kind text := lower(btrim(coalesce(p_kind, 'all')));
begin
  perform private.require_staff_edit();
  return jsonb_build_object(
    'ok', true,
    'items', case when kind in ('all','items','balls','berries') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'item', 'key', x.row->>'key', 'name', x.row->>'name',
        'category', x.row->>'category', 'identity', x.row
      ) order by x.row->>'category', x.row->>'name')
      from (
        select private.item_identity(b.key) as row from public.capture_balls b
        union all
        select private.item_identity(r.key) from public.capture_berries r where r.capture_enabled or r.store_available
        union all
        select private.item_identity(k) from unnest(array['bait','lure','rarecandy','firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord']) k
      ) x
      where q = '' or x.row->>'name' ilike '%'||q||'%' or x.row->>'key' ilike '%'||q||'%'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'avatars', case when kind in ('all','avatars') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'avatar', 'key', l.id, 'name', l.name, 'pack', l.pack_key,
        'portrait', l.portrait_file, 'ext', l.ext
      ) order by l.sort, l.name)
      from private.trainer_looks l
      where l.visible and (q = '' or l.name ilike '%'||q||'%' or l.id ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end,
    'avatarPacks', case when kind in ('all','avatars','packs') then coalesce((
      select jsonb_agg(jsonb_build_object('kind','avatarPack','key', i.extra->>'pack', 'name', i.name, 'sku', i.sku) order by i.name)
      from private.store_items i
      where nullif(i.extra->>'pack','') is not null
        and (q = '' or i.name ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end,
    'cosmetics', case when kind in ('all','cosmetics') then coalesce((
      select jsonb_agg(jsonb_build_object('kind','cosmetic','key', c.id, 'name', c.name, 'slot', c.kind) order by c.sort_order, c.name)
      from public.progression_cosmetics c
      where c.enabled and (q = '' or c.name ilike '%'||q||'%' or c.id ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

grant execute on function public.admin_content_studio() to authenticated;
grant execute on function public.admin_item_library(text, text) to authenticated;
grant execute on function public.admin_content_picker(text, text) to authenticated;
