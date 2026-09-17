-- Phase 9 Balance V1. Small, named numeric changes only. No purchase clawback.

create or replace function private.bag_bonus_cap()
returns int
language sql
stable
as $$
  select greatest(0, coalesce((private.game_settings()->'economyBalance'->>'bagBonusCap')::int, 100));
$$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $function$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  berry_add int;
  evo_add int;
  k text;
  n int;
  room int;
  paid_room int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := greatest(coalesce((p_grants->>'bag_bonus')::int, 0), 0);
  paid_room := greatest(0, private.bag_bonus_cap() - coalesce(inv.bag_bonus, 0));
  room := least(private.bag_capacity_max() - private.bag_capacity(p_uid), paid_room);
  if add_bonus > 0 and room <= 0 then
    raise exception 'Bag space upgrades are at the current cap.';
  end if;
  if add_bonus > room then
    add_bonus := greatest(room, 0);
  end if;
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  berry_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.capture_berry_keys())
  ), 0);
  evo_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.evo_item_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add + berry_add + evo_add;
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a Pouch on the Store or use some items first.';
  end if;
  update public.inventories
    set berry = berry + coalesce((p_grants->>'berry')::int, 0),
        bait = bait + coalesce((p_grants->>'bait')::int, 0),
        pokeball = pokeball + coalesce((p_grants->>'pokeball')::int, 0),
        greatball = greatball + coalesce((p_grants->>'greatball')::int, 0),
        ultraball = ultraball + coalesce((p_grants->>'ultraball')::int, 0),
        lure = lure + coalesce((p_grants->>'lure')::int, 0),
        coins = coins + coalesce((p_grants->>'coins')::int, 0),
        bag_bonus = bag_bonus + add_bonus,
        updated_at = now()
    where user_id = p_uid;
  foreach k in array private.extra_ball_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[k], to_jsonb(coalesce((balls->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.capture_berry_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[k], to_jsonb(coalesce((berries->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.evo_item_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      perform private.adjust_item(p_uid, k, n);
    end if;
  end loop;
end;
$function$;

update public.site_config
set game_settings = jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(game_settings, '{}'::jsonb),
          '{captureBalance,baseChanceTiers}',
          '[
            {"chance":0.34,"minCatchRate":201},
            {"chance":0.3,"minCatchRate":151},
            {"chance":0.25,"minCatchRate":101},
            {"chance":0.21,"minCatchRate":76},
            {"chance":0.16,"minCatchRate":45},
            {"chance":0.11,"minCatchRate":25},
            {"chance":0.07,"minCatchRate":10},
            {"chance":0.04,"minCatchRate":1}
          ]'::jsonb
        ),
        '{economyBalance,dailySupply,coins}',
        '40'::jsonb
      ),
      '{economyBalance,bagBonusCap}',
      '100'::jsonb
    ),
    updated_at = now()
where id = 1;

update public.capture_berries
set reward_bonus = 2.0
where key = 'pinap';

update public.capture_berries
set reward_bonus = 1.5
where key = 'silverpinap';

update public.capture_balls
set store_enabled = false
where key in ('masterball', 'beastball', 'dreamball');

update private.store_items
set status = 'draft',
    visible = false,
    grants = '{}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('status', 'draft', 'detail', 'Not sold. Master Ball remains a milestone reward.')
where sku = 'master1';

update private.store_items
set status = 'draft',
    visible = false,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('status', 'draft', 'detail', 'Kanto has no Ultra Beasts. Unsold until a future regional niche exists.')
where sku = 'beast1';

update private.store_items
set status = 'draft',
    visible = false,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('status', 'draft', 'detail', 'No catch identity beyond a Poké Ball. Removed from the live shelf.')
where sku = 'dream1';

update private.store_items
set name = 'Starter Pack',
    blurb = 'Stream supplies: 6 Poké Balls, 2 Great Balls, 4 Oran, 2 Honey.',
    grants = '{"bait":2,"berry":4,"pokeball":6,"greatball":2}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Supplies only. No bag upgrade. No Ultra Ball.'
    )
where sku = 'bits-starter';

update private.store_items
set name = 'Picnic Pack',
    blurb = 'Berry-forward support: 8 Honey, 8 Oran, 2 Razz.',
    grants = '{"bait":8,"berry":8,"razz":2}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Catch-help berries, not Ultra stacks.'
    )
where sku = 'bits-pantry';

update private.store_items
set name = 'Adventure Pack',
    blurb = 'Mixed Balls including Nest Balls for common species.',
    grants = '{"bait":3,"berry":3,"pokeball":5,"greatball":4,"nestball":2}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Specialist Nest Balls instead of Ultra Ball.'
    )
where sku = 'bits-great';

update private.store_items
set name = 'Explorer Pack',
    blurb = 'Convenience kit: Poké Balls, Honey, Radar, and Dusk Balls.',
    grants = '{"pokeball":8,"berry":6,"bait":4,"lure":1,"duskball":2}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Replaces bag-only Explorer. Existing bag_bonus already granted is kept.'
    )
where sku = 'bits-pouch';

update private.store_items
set name = 'Ultra Pack',
    blurb = 'Premium supplies with 2 Ultra Balls, not a stack of 8.',
    grants = '{"bait":3,"berry":4,"pokeball":6,"greatball":3,"ultraball":2,"lure":1}'::jsonb,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Ultra Ball 8 → 2. No bag upgrade.'
    )
where sku = 'bits-ultra';

update private.store_items
set status = 'published',
    visible = true,
    extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object(
      'productKind', 'bits',
      'status', 'published',
      'detail', 'Phase 9 V1. Honey-forward community support. Published.'
    )
where sku = 'bits-community';
