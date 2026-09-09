-- Split Sonic Origins looks into their own Classic pack.

create or replace function private.premium_avatar_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'sku', 'avatar-sonic',
      'name', 'Sonic The Hedgehog Advance Trainer Sprite Pack',
      'cost', 200,
      'pack', 'sonic',
      'blurb', 'Unlock Sonic, Tails, Knuckles, Amy, and Cream from Sonic Advance for your Trainer ID.',
      'looks', jsonb_build_array(
        'sonic-sonic', 'sonic-tails', 'sonic-knuckles', 'sonic-amy', 'sonic-cream'
      )
    ),
    jsonb_build_object(
      'sku', 'avatar-sonic-classic',
      'name', 'Sonic The Hedgehog Classic Trainer Sprite Pack',
      'cost', 150,
      'pack', 'sonic-classic',
      'blurb', 'Unlock classic Sonic Origins looks for Sonic, Tails, Knuckles, and Amy.',
      'looks', jsonb_build_array(
        'sonic-origins-sonic',
        'sonic-origins-tails',
        'sonic-origins-knuckles',
        'sonic-origins-amy'
      )
    ),
    jsonb_build_object(
      'sku', 'avatar-digimon',
      'name', 'Digimon Adventure Trainer Sprite Pack',
      'cost', 250,
      'pack', 'digimon',
      'blurb', 'Unlock Taichi, Yamato, Sora, Hikari, Takeru, Joe, Mimi, and Koushiro for your Trainer ID.',
      'looks', jsonb_build_array('taichi', 'yamato', 'sora', 'hikari', 'takeru', 'joe', 'mimi', 'koushiro')
    ),
    jsonb_build_object(
      'sku', 'avatar-genderbend',
      'name', 'Pokémon Genderbending Sprite Pack',
      'cost', 200,
      'pack', 'genderbend',
      'blurb', 'Unlock Ashley Crossdress Kanto, Alola, and Unova, plus Serena Crossdress, for your Trainer ID.',
      'looks', jsonb_build_array(
        'ashley',
        'ashley-crossdress-alola',
        'ashley-crossdress-unova',
        'serena-crossdress'
      )
    )
  );
$$;

create or replace function private.premium_sprite_pack(p_sprite text)
returns text
language sql
immutable
as $$
  select case
    when p_sprite in (
      'sonic-sonic', 'sonic-tails', 'sonic-knuckles', 'sonic-amy', 'sonic-cream'
    ) then 'sonic'
    when p_sprite in (
      'sonic-origins-sonic',
      'sonic-origins-tails',
      'sonic-origins-knuckles',
      'sonic-origins-amy'
    ) then 'sonic-classic'
    when p_sprite in ('taichi', 'yamato', 'sora', 'hikari', 'takeru', 'joe', 'mimi', 'koushiro') then 'digimon'
    when p_sprite in (
      'ashley', 'ash-ashley',
      'ashley-crossdress-alola', 'ashley-crossdress-unova',
      'serena-crossdress'
    ) then 'genderbend'
    else null
  end;
$$;

update public.profiles
set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), 'sonic-classic')
where (
    'sonic' = any (coalesce(owned_avatar_packs, '{}'::text[]))
    or trainer_sprite in (
      'sonic-origins-sonic',
      'sonic-origins-tails',
      'sonic-origins-knuckles',
      'sonic-origins-amy'
    )
  )
  and not ('sonic-classic' = any (coalesce(owned_avatar_packs, '{}'::text[])));
