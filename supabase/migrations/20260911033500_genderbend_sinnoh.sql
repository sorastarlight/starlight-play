-- Add Ashley Crossdress Sinnoh to the Genderbending pack.

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
    'ashley-crossdress-alola', 'ashley-crossdress-unova', 'ashley-crossdress-sinnoh', 'serena-crossdress',
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

update private.store_items
set
  blurb = 'Unlock Ashley Crossdress Kanto, Alola, Unova, and Sinnoh, plus Serena Crossdress, for your Trainer ID.',
  extra = jsonb_set(
    coalesce(extra, '{}'::jsonb),
    '{looks}',
    '["ashley","ashley-crossdress-alola","ashley-crossdress-unova","ashley-crossdress-sinnoh","serena-crossdress"]'::jsonb
  )
where sku = 'avatar-genderbend';
