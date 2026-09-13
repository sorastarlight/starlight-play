-- Sell Honey, Berries, and Poké Balls as singles.
-- +1 / +5 / +10 still add that many singles to checkout.
-- Honey ×5 is hidden because Honey already exists as bait1.

update private.store_items
   set visible = false
 where sku = 'bait5';

update private.store_items i
   set
     cost = coalesce(nullif((i.extra->>'unitPrice')::int, 0), i.cost),
     grants = (
       select coalesce(jsonb_object_agg(key, to_jsonb(1)), '{}'::jsonb)
       from jsonb_each(i.grants)
     ),
     name = regexp_replace(i.name, '\s*[×xX]\s*\d+\s*$', ''),
     extra = i.extra || jsonb_build_object(
       'unitPrice', coalesce(nullif((i.extra->>'unitPrice')::int, 0), i.cost)
     )
 where i.sku in (
   'poke5', 'great3',
   'berry5', 'cheri5', 'chesto5', 'pecha5', 'rawst5', 'aspear5',
   'nanab5', 'pinap5', 'sitrus3', 'lum3', 'razz3'
 );

update private.store_items
   set name = regexp_replace(name, '\s*[×xX]\s*\d+\s*$', '')
 where name ~ '\s*[×xX]\s*\d+\s*$';

update private.store_categories
   set icon = 'fire-stone.png'
 where key = 'evolution';

insert into private.store_assets (filename, kind, label)
values
  ('fire-stone.png', 'item', 'Fire Stone'),
  ('water-stone.png', 'item', 'Water Stone'),
  ('thunder-stone.png', 'item', 'Thunder Stone'),
  ('leaf-stone.png', 'item', 'Leaf Stone'),
  ('moon-stone.png', 'item', 'Moon Stone'),
  ('linking-cord.png', 'item', 'Linking Cord'),
  ('dream-ball.png', 'item', 'Dream Ball'),
  ('beast-ball.png', 'item', 'Beast Ball')
on conflict (filename) do update
  set label = excluded.label,
      kind = excluded.kind;

update private.store_items
   set sprite = case sku
     when 'firestone1' then 'fire-stone.png'
     when 'waterstone1' then 'water-stone.png'
     when 'thunderstone1' then 'thunder-stone.png'
     when 'leafstone1' then 'leaf-stone.png'
     when 'moonstone1' then 'moon-stone.png'
     when 'linkingcord1' then 'linking-cord.png'
     when 'dream1' then 'dream-ball.png'
     when 'beast1' then 'beast-ball.png'
     else sprite
   end
 where sku in (
   'firestone1', 'waterstone1', 'thunderstone1', 'leafstone1',
   'moonstone1', 'linkingcord1', 'dream1', 'beast1'
 );
