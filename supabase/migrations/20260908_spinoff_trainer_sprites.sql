create or replace function private.trainer_sprite_ok(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') in (
    'red-gen1', 'leaf-gen3',
    'ethan-gen2', 'kris-gen2',
    'brendan-gen3', 'may-gen3',
    'lucas', 'dawn',
    'hilbert', 'hilda',
    'calem', 'serena',
    'elio', 'selene',
    'victor', 'gloria',
    'florian-s', 'juliana-s',
    'paxton', 'harmony',
    'chase', 'elaine', 'red-lgpe',
    'rei', 'akari',
    'pokemonranger-gen3', 'pokemonrangerf-gen3rs',
    'pokemonranger-gen4', 'pokemonrangerf-gen4',
    'hero-conquest', 'heroine-conquest',
    'player-go'
  );
$$;
