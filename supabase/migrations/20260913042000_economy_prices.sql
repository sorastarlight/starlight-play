-- Price migration. Existing inventories and balances are not touched.
-- Pack store prices = unit price × quantity granted.

update public.capture_balls set
  shop_price = v.price,
  sell_price = greatest(1, floor(v.price * 0.4)::int),
  economic_tier = v.tier,
  store_enabled = v.store_on,
  description = v.blurb,
  updated_at = now()
from (values
  ('pokeball', 100, 'basic', true, 'A standard Poké Ball for catching wild Pokémon.'),
  ('hisuipokeball', 100, 'basic', true, 'A Hisuian Poké Ball. Same catch power as a Poké Ball, different look.'),
  ('premierball', 100, 'basic', true, 'A commemorative Poké Ball. You also earn these as a bonus on large Ball purchases.'),
  ('luxuryball', 100, 'basic', true, 'A standard Poké Ball with a luxury finish.'),
  ('healball', 100, 'basic', true, 'A standard Poké Ball with a soothing look.'),
  ('friendball', 100, 'basic', true, 'A standard Poké Ball with a friendly look.'),
  ('featherball', 100, 'basic', true, 'A standard Hisuian Feather Ball.'),
  ('hisuiheavyball', 100, 'basic', true, 'A standard Hisuian Heavy Ball.'),
  ('oldball', 110, 'basic', true, 'An old-style Poké Ball with standard catch power.'),
  ('strangeball', 110, 'basic', true, 'A curious Poké Ball with standard catch power.'),
  ('ashball', 125, 'basic', true, 'A commemorative Poké Ball with standard catch power.'),
  ('safariball', 125, 'basic', true, 'A Safari Ball with a small edge over a Poké Ball.'),
  ('sportball', 125, 'basic', true, 'A Sport Ball with a small edge over a Poké Ball.'),
  ('cherishball', 125, 'basic', true, 'A commemorative Poké Ball with standard catch power.'),
  ('cloneball', 125, 'basic', true, 'A commemorative Poké Ball with standard catch power.'),
  ('darkball', 125, 'basic', true, 'A commemorative Poké Ball with standard catch power.'),
  ('gsball', 125, 'basic', true, 'A commemorative Poké Ball with standard catch power.'),
  ('originball', 150, 'standard', true, 'A rare-looking Poké Ball with standard catch power.'),
  ('greatball', 225, 'standard', true, 'A higher-performance Poké Ball that improves your chance of a successful catch.'),
  ('hisuigreatball', 225, 'standard', true, 'A Hisuian Great Ball with the same catch power as a Great Ball.'),
  ('wingball', 225, 'standard', true, 'A Hisuian Wing Ball with Great Ball catch power.'),
  ('leadenball', 225, 'standard', true, 'A Hisuian Leaden Ball with Great Ball catch power.'),
  ('beastball', 225, 'standard', true, 'Best saved for Ultra Beasts. Weaker than a Poké Ball against ordinary Pokémon.'),
  ('nestball', 275, 'standard', true, 'Works best against common, easily caught Pokémon.'),
  ('netball', 300, 'standard', true, 'Best against Water- and Bug-type Pokémon.'),
  ('diveball', 300, 'standard', true, 'Best against Water-type Pokémon.'),
  ('lureball', 300, 'standard', true, 'Best against Water-type Pokémon.'),
  ('timerball', 300, 'standard', true, 'A reliable Ball with better catch power than a Poké Ball.'),
  ('loveball', 300, 'standard', true, 'A little better catch power than a Poké Ball.'),
  ('levelball', 300, 'standard', true, 'A little better catch power than a Poké Ball.'),
  ('duskball', 325, 'standard', true, 'Best at night on the stream clock.'),
  ('moonball', 325, 'standard', true, 'Best against Moon Stone evolution families.'),
  ('fastball', 325, 'standard', true, 'Best against very fast Pokémon.'),
  ('heavyball', 325, 'standard', true, 'Best against very heavy Pokémon.'),
  ('repeatball', 350, 'premium', true, 'Best against Pokémon you have already caught.'),
  ('quickball', 350, 'premium', true, 'A strong general-purpose Ball for this encounter.'),
  ('dreamball', 350, 'premium', true, 'A special Ball with a modest catch bonus.'),
  ('ultraball', 500, 'premium', true, 'A powerful Poké Ball. Best saved for Pokémon you really want.'),
  ('hisuiultraball', 500, 'premium', true, 'A Hisuian Ultra Ball with the same catch power as an Ultra Ball.'),
  ('jetball', 500, 'premium', true, 'A Hisuian Jet Ball with Ultra Ball catch power.'),
  ('gigatonball', 500, 'premium', true, 'A Hisuian Gigaton Ball with Ultra Ball catch power.'),
  ('masterball', 10000, 'exceptional', false, 'Never fails. Not sold on the ordinary shelf.')
) as v(key, price, tier, store_on, blurb)
where public.capture_balls.key = v.key;

update public.capture_berries set
  shop_price = v.price,
  sell_price = greatest(1, floor(v.price * 0.4)::int),
  economic_tier = v.tier,
  rpg_description = v.blurb,
  updated_at = now()
from (values
  ('berry', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('cheri', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('chesto', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('pecha', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('rawst', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('aspear', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('nanab', 60, 'basic', 'A tasty Berry that makes a wild Pokémon a little easier to catch.'),
  ('pinap', 175, 'standard', 'Helps a little with the catch and pays a small bonus when you succeed.'),
  ('sitrus', 150, 'standard', 'A quality Berry that makes a wild Pokémon easier to catch.'),
  ('lum', 150, 'standard', 'A quality Berry that makes a wild Pokémon easier to catch.'),
  ('persim', 150, 'standard', 'A quality Berry that makes a wild Pokémon easier to catch.'),
  ('razz', 200, 'standard', 'A tasty Berry that makes a wild Pokémon easier to catch.'),
  ('figy', 250, 'premium', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.'),
  ('wiki', 250, 'premium', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.'),
  ('mago', 250, 'premium', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.'),
  ('aguav', 250, 'premium', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.'),
  ('iapapa', 250, 'premium', 'A rich Berry that makes a wild Pokémon noticeably easier to catch.'),
  ('silverpinap', 400, 'premium', 'Makes a wild Pokémon easier to catch and sweetens the reward if you succeed.'),
  ('goldenrazz', 500, 'premium', 'A rare golden Berry that provides a powerful boost to your catch attempt.')
) as v(key, price, tier, blurb)
where public.capture_berries.key = v.key;

-- Rebuild coin-shelf prices from the catalog unit price × granted quantity.
update private.store_items i
   set cost = greatest(0, q.unit * q.qty),
       blurb = coalesce(q.blurb, i.blurb),
       visible = case when q.master then false else i.visible end,
       extra = coalesce(i.extra, '{}'::jsonb)
         || jsonb_build_object('economicTier', q.tier, 'unitPrice', q.unit)
from (
  select i.sku,
         coalesce((
           select b.shop_price from public.capture_balls b
           where (i.grants ? b.key) limit 1
         ), (
           select b.shop_price from public.capture_berries b
           where (i.grants ? b.key) limit 1
         ), case when i.grants ? 'bait' then 125 else i.cost end) as unit,
         greatest(1, coalesce((
           select (value)::int from jsonb_each_text(i.grants) limit 1
         ), 1)) as qty,
         coalesce((
           select b.description from public.capture_balls b
           where (i.grants ? b.key) limit 1
         ), (
           select b.rpg_description from public.capture_berries b
           where (i.grants ? b.key) limit 1
         ), case when i.grants ? 'bait'
           then 'Contribute Honey to help every Trainer in the encounter! The more Trainers who contribute, the stronger the community bonus becomes.'
           else i.blurb end) as blurb,
         coalesce((
           select b.economic_tier from public.capture_balls b
           where (i.grants ? b.key) limit 1
         ), (
           select b.economic_tier from public.capture_berries b
           where (i.grants ? b.key) limit 1
         ), 'standard') as tier,
         i.grants ? 'masterball' as master
  from private.store_items i
  where coalesce(i.bits, 0) = 0
    and (
      exists (select 1 from public.capture_balls b where i.grants ? b.key)
      or exists (select 1 from public.capture_berries b where i.grants ? b.key)
      or i.grants ? 'bait'
    )
) q
where i.sku = q.sku;

-- Honey single, Dream Ball, Beast Ball. Same store, no second shop.
insert into private.store_items (category_id, sku, name, blurb, cost, grants, sprite, thumb, sort, featured, visible, extra)
select c.id, v.sku, v.name, v.blurb, v.cost, v.grants::jsonb, v.sprite, '', v.sort, false, v.visible,
       jsonb_build_object('economicTier', v.tier, 'unitPrice', v.unit, 'ballKey', v.ball)
from private.store_categories c
join (values
  ('field-kit', 'bait1', 'Honey', 'Contribute Honey to help every Trainer in the encounter! The more Trainers who contribute, the stronger the community bonus becomes.', 125, '{"bait":1}', 'honey.png', 5, true, 'basic', 125, null),
  ('balls', 'dream1', 'Dream Ball', 'A special Ball with a modest catch bonus.', 350, '{"dreamball":1}', 'dream-ball.png', 210, true, 'premium', 350, 'dreamball'),
  ('balls', 'beast1', 'Beast Ball', 'Best saved for Ultra Beasts. Weaker than a Poké Ball against ordinary Pokémon.', 225, '{"beastball":1}', 'beast-ball.png', 220, true, 'standard', 225, 'beastball')
) as v(cat, sku, name, blurb, cost, grants, sprite, sort, visible, tier, unit, ball)
  on c.key = v.cat
on conflict (sku) do update
  set cost = excluded.cost,
      blurb = excluded.blurb,
      grants = excluded.grants,
      visible = excluded.visible,
      extra = excluded.extra;

update private.store_items
   set blurb = 'Contribute Honey to help every Trainer in the encounter! The more Trainers who contribute, the stronger the community bonus becomes.',
       extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('economicTier', 'basic', 'unitPrice', 125)
 where sku = 'bait5';
