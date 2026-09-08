create or replace function private.card_bg_ok(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') in (
    'kanto', 'johto', 'hoenn', 'sinnoh', 'unova',
    'kalos', 'alola', 'galar', 'hisui', 'paldea',
    'starlight', 'candy', 'peach', 'lilac',
    'sakura', 'cotton', 'ribbon', 'aurora'
  );
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
    'player-go'
  );
$$;
