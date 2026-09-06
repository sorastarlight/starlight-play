-- Favorite save used a PL/pgSQL variable named variant, which clashed with catches.variant.

create or replace function public.play_update_profile(p_display_name text, p_favorite_dex int, p_favorite_variant text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  nice text := btrim(coalesce(p_display_name, ''));
  fav_variant text := coalesce(nullif(btrim(coalesce(p_favorite_variant, '')), ''), 'normal');
begin
  if uid is null then
    raise exception 'Sign in to edit your trainer card.' using errcode = '42501';
  end if;
  if char_length(nice) < 2 or char_length(nice) > 24 then
    raise exception 'Display names need 2 to 24 characters.';
  end if;
  if nice !~ '^[A-Za-z0-9][A-Za-z0-9 _''.-]{0,23}$' then
    raise exception 'Display names can use letters, numbers, spaces, and . '' -';
  end if;
  if p_favorite_dex is not null then
    if not exists (select 1 from public.catches c where c.user_id = uid and c.dex = p_favorite_dex) then
      raise exception 'Favorite Pokémon must be one you have caught.';
    end if;
    if not exists (
      select 1 from public.catches c
      where c.user_id = uid and c.dex = p_favorite_dex and coalesce(c.variant, 'normal') = fav_variant
    ) then
      fav_variant := 'normal';
    end if;
  end if;
  update public.profiles
    set display_name = nice,
        favorite_dex = p_favorite_dex,
        favorite_variant = case when p_favorite_dex is null then 'normal' else fav_variant end,
        updated_at = now()
    where id = uid;
  return jsonb_build_object('ok', true, 'message', 'Trainer card updated.', 'trainer', private.trainer_card(uid));
end;
$$;

grant execute on function public.play_update_profile(text, int, text) to authenticated;
