-- Rename the genderbending premium pack.

create or replace function private.premium_avatar_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'sku', 'avatar-sonic',
      'name', 'Sonic the Hedgehog Series',
      'cost', 200,
      'pack', 'sonic',
      'blurb', 'Unlock Sonic Advance and Sonic Origins looks for your Trainer ID.',
      'looks', jsonb_build_array(
        'sonic-sonic', 'sonic-origins-sonic',
        'sonic-tails', 'sonic-origins-tails',
        'sonic-knuckles', 'sonic-origins-knuckles',
        'sonic-amy', 'sonic-origins-amy',
        'sonic-cream'
      )
    ),
    jsonb_build_object(
      'sku', 'avatar-digimon',
      'name', 'Digimon Adventure',
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
