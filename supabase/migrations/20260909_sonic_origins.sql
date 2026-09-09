-- Add Sonic Origins looks to the existing Premium Sonic pack.

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
      'sonic-sonic', 'sonic-origins-sonic',
      'sonic-tails', 'sonic-origins-tails',
      'sonic-knuckles', 'sonic-origins-knuckles',
      'sonic-amy', 'sonic-origins-amy',
      'sonic-cream'
    ) then 'sonic'
    when p_sprite in ('taichi', 'yamato', 'sora', 'hikari', 'takeru', 'joe', 'mimi', 'koushiro') then 'digimon'
    else null
  end;
$$;

create or replace function private.trainer_sprite_ok(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') in (
    'red-gen1', 'red-gen1rb', 'red-gen1main', 'red-gen1title',
    'red-gen2', 'red-gen3', 'red-gen7', 'red',
    'leaf-gen3', 'green',
    'ethan-gen2', 'ethan-gen2c', 'ethan', 'ethan-pokeathlon',
    'kris-gen2', 'kris', 'lyra', 'lyra-pokeathlon',
    'brendan-gen3', 'brendan-gen3rs', 'brendan-rs', 'brendan-e',
    'brendan', 'brendan-contest',
    'may-gen3', 'may-gen3rs', 'may-rs', 'may-e',
    'may', 'may-contest',
    'lucas', 'lucas-gen4pt', 'lucas-contest',
    'dawn', 'dawn-gen4pt', 'dawn-contest',
    'hilbert', 'hilbert-wonderlauncher',
    'hilda', 'hilda-wonderlauncher',
    'nate', 'rosa', 'rosa-wonderlauncher',
    'calem', 'serena', 'serena-anime',
    'elio', 'elio-usum', 'selene', 'selene-usum',
    'victor', 'victor-dojo', 'victor-tundra', 'victor-league',
    'gloria', 'gloria-dojo', 'gloria-tundra', 'gloria-league',
    'florian-s', 'florian-bb', 'florian-festival',
    'juliana-s', 'juliana-bb', 'juliana-festival',
    'paxton', 'harmony',
    'chase', 'elaine', 'red-lgpe',
    'rei', 'akari',
    'pokemonranger-gen3', 'pokemonrangerf-gen3rs',
    'pokemonranger-gen4', 'pokemonrangerf-gen4',
    'hero-conquest', 'heroine-conquest',
    'player-go',
    'ash', 'ash-capbackward', 'ash-johto', 'ash-hoenn',
    'ash-sinnoh', 'ash-unova', 'ash-kalos', 'ash-alola', 'ash-ashley', 'ashley',
    'ashley-crossdress-alola', 'ashley-crossdress-unova',
    'misty', 'misty-gen1', 'misty-lgpe',
    'brock', 'brock-gen1', 'brock-lgpe',
    'oak', 'clemont', 'iris', 'cynthia-anime', 'yellow', 'liko',
    'kiawe', 'lana', 'mallow', 'sophocles', 'giovanni',
    'teamrocket', 'jessiejames-gen1', 'nurse', 'officer-gen2',
    'sonic-sonic', 'sonic-origins-sonic',
    'sonic-tails', 'sonic-origins-tails',
    'sonic-knuckles', 'sonic-origins-knuckles',
    'sonic-amy', 'sonic-origins-amy',
    'sonic-cream',
    'taichi', 'yamato', 'sora', 'hikari', 'takeru', 'joe', 'mimi', 'koushiro'
  );
$$;
