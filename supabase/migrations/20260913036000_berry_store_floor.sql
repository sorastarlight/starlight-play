-- Berry Stand: a floor on the existing store rather than a second shop.
-- Prices follow the economy that was already in place (Oran was 5 coins each).

insert into private.store_categories (id, key, name, blurb, icon, sort, kind, visible, system)
values (
  '11111111-1111-1111-1111-111111111006',
  'berries',
  'Berry Stand',
  'Berries make a wild Pokémon easier to catch. You may use one Berry per encounter.',
  'razz-berry.png',
  25,
  'coins',
  true,
  true
)
on conflict (id) do update
  set key = excluded.key,
      name = excluded.name,
      blurb = excluded.blurb,
      icon = excluded.icon,
      sort = excluded.sort,
      kind = excluded.kind,
      visible = excluded.visible;

with rows(sku, name, blurb, cost, grants, sprite, sort, featured) as (
  values
    ('berry5', 'Oran Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"berry": 5}'::jsonb, 'oran-berry.png', 10, false),
    ('cheri5', 'Cheri Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"cheri": 5}'::jsonb, 'cheri-berry.png', 20, false),
    ('chesto5', 'Chesto Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"chesto": 5}'::jsonb, 'chesto-berry.png', 30, false),
    ('pecha5', 'Pecha Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"pecha": 5}'::jsonb, 'pecha-berry.png', 40, false),
    ('rawst5', 'Rawst Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"rawst": 5}'::jsonb, 'rawst-berry.png', 50, false),
    ('aspear5', 'Aspear Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"aspear": 5}'::jsonb, 'aspear-berry.png', 60, false),
    ('nanab5', 'Nanab Berry ×5', 'A tasty Berry that makes a wild Pokémon a little easier to catch.', 25, '{"nanab": 5}'::jsonb, 'nanab-berry.png', 70, false),
    ('pinap5', 'Pinap Berry ×5', 'Helps a little with the catch and pays a small bonus when you succeed.', 30, '{"pinap": 5}'::jsonb, 'pinap-berry.png', 80, false),
    ('sitrus3', 'Sitrus Berry ×3', 'A quality Berry that makes a wild Pokémon easier to catch.', 30, '{"sitrus": 3}'::jsonb, 'sitrus-berry.png', 90, false),
    ('lum3', 'Lum Berry ×3', 'A quality Berry that makes a wild Pokémon easier to catch.', 30, '{"lum": 3}'::jsonb, 'lum-berry.png', 100, false),
    ('razz3', 'Razz Berry ×3', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.', 42, '{"razz": 3}'::jsonb, 'razz-berry.png', 110, false),
    ('silverpinap1', 'Silver Pinap Berry', 'Makes a wild Pokémon easier to catch and sweetens the reward if you succeed.', 24, '{"silverpinap": 1}'::jsonb, 'pinap-berry.png', 120, false),
    ('goldenrazz1', 'Golden Razz Berry', 'A rare golden Berry that makes a wild Pokémon much easier to catch.', 45, '{"goldenrazz": 1}'::jsonb, 'razz-berry.png', 130, true)
)
insert into private.store_items (category_id, sku, name, blurb, cost, grants, sprite, thumb, sort, featured, visible)
select '11111111-1111-1111-1111-111111111006', r.sku, r.name, r.blurb, r.cost, r.grants, r.sprite, '', r.sort, r.featured, true
from rows r
on conflict (sku) do update
  set category_id = excluded.category_id,
      name = excluded.name,
      blurb = excluded.blurb,
      cost = excluded.cost,
      grants = excluded.grants,
      sprite = excluded.sprite,
      sort = excluded.sort,
      featured = excluded.featured,
      visible = true;
