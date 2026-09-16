-- Phase 3: presentation notices for first Pokédex / shiny registration.
-- Grants already happen in after_catch_xp. This only tells the client what already happened.

create or replace function private.after_catch_present()
returns trigger
language plpgsql
as $function$
declare
  first_species boolean;
  first_shiny boolean;
  species_name text;
begin
  if new.user_id is null then
    return new;
  end if;
  if new.round_id is not null and private.round_is_test(new.round_id) then
    return new;
  end if;

  select coalesce(s.name, 'Pokémon') into species_name
    from public.species s
   where s.dex = new.dex;
  species_name := coalesce(species_name, coalesce(new.name, 'Pokémon'));

  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;

  if first_species then
    perform private.push_notice(
      new.user_id, 'pokedex',
      'New Pokédex Entry!',
      species_name,
      jsonb_build_object(
        'species', new.dex,
        'variant', coalesce(new.variant, 'normal'),
        'gender', coalesce(new.gender, ''),
        'shiny', coalesce(new.variant, '') like '%shiny%',
        'source', 'capture'
      )
    );
    return new;
  end if;

  if coalesce(new.variant, '') like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and coalesce(variant, '') like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.push_notice(
        new.user_id, 'pokedex',
        'Shiny registered',
        species_name,
        jsonb_build_object(
          'species', new.dex,
          'variant', coalesce(new.variant, 'shiny'),
          'gender', coalesce(new.gender, ''),
          'shiny', true,
          'source', 'capture'
        )
      );
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists catches_after_present on public.catches;
create trigger catches_after_present
  after insert on public.catches
  for each row
  execute function private.after_catch_present();
