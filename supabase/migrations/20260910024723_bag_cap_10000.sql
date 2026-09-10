-- Raise the bag hard cap from 120 to 10,000. Pouches and Pass space can grow up to that.

create or replace function private.bag_capacity_max()
returns int
language sql
immutable
as $$
  select 10000;
$$;

create or replace function private.bag_capacity(p_uid uuid)
returns int
language sql
stable
as $$
  select least(private.bag_capacity_max(),
    50
    + coalesce((select bag_bonus from public.inventories where user_id = p_uid), 0)
    + case when coalesce((select starlight_pass from public.profiles where id = p_uid), false) then 25 else 0 end
  );
$$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  k text;
  n int;
  room int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := greatest(coalesce((p_grants->>'bag_bonus')::int, 0), 0);
  room := private.bag_capacity_max() - private.bag_capacity(p_uid);
  if add_bonus > 0 and room <= 0 then
    raise exception 'Bag space is already at the 10,000 item maximum.';
  end if;
  if add_bonus > room then
    add_bonus := greatest(room, 0);
  end if;
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add;
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
        set balls = jsonb_set(
          coalesce(balls, '{}'::jsonb),
          array[k],
          to_jsonb(coalesce((balls->>k)::int, 0) + n)
        ),
        updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
end;
$$;
