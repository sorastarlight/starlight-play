insert into private.store_assets (filename, kind, label)
values ('pack-thumb.png', 'item', 'Pack art placeholder')
on conflict (filename) do update
set label = excluded.label;

update private.store_items
set
  thumb = case
    when thumb in ('', 'premium-avatars.png', 'images/trainers/premium-avatars.png', 'poke-ball.png')
      then 'pack-thumb.png'
    else thumb
  end,
  sprite = case
    when sprite in ('', 'premium-avatars.png', 'poke-ball.png')
      then 'pack-thumb.png'
    else sprite
  end
where sku like 'avatar-%';
