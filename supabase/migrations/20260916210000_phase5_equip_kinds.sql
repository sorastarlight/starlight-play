-- Phase 5 follow-up: EQUIP NOW can equip titles and badges through the same RPC.

create or replace function public.play_equip_cosmetic(p_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.progression_cosmetics;
  title_rec public.progression_titles;
  badge_rec public.progression_badges;
  asset text;
  featured text[];
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  perform private.evaluate_cosmetics(uid);
  select * into rec from public.progression_cosmetics where id = p_id and enabled;
  if rec.id is not null then
    perform private.assert_cosmetic_owned(uid, rec.kind, private.cosmetic_asset(rec.id));
    asset := private.cosmetic_asset(rec.id);
    if rec.kind = 'background' then
      update public.profiles set card_bg = asset, updated_at = now() where id = uid;
    elsif rec.kind = 'frame' then
      update public.profiles set card_frame = asset, updated_at = now() where id = uid;
    end if;
    update public.trainer_cosmetics set seen_at = coalesce(seen_at, now())
     where user_id = uid and cosmetic_id = rec.id;
    return jsonb_build_object('ok', true, 'message', rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  select t.* into title_rec
    from public.progression_titles t
    join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
   where t.id = p_id and t.enabled;
  if title_rec.id is not null then
    update public.profiles
       set active_title_id = title_rec.id, trainer_title = title_rec.name, updated_at = now()
     where id = uid;
    update public.trainer_titles set seen_at = coalesce(seen_at, now())
     where user_id = uid and title_id = title_rec.id;
    return jsonb_build_object('ok', true, 'message', title_rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  select b.* into badge_rec
    from public.progression_badges b
    join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = uid
   where b.id = p_id and b.enabled;
  if badge_rec.id is not null then
    select featured_badge_ids into featured from public.profiles where id = uid;
    if not (p_id = any (coalesce(featured, '{}'::text[]))) then
      featured := (array[p_id] || coalesce(featured, '{}'::text[]))[1:5];
      update public.profiles set featured_badge_ids = featured, updated_at = now() where id = uid;
    end if;
    update public.trainer_badges set seen_at = coalesce(seen_at, now())
     where user_id = uid and badge_id = badge_rec.id;
    return jsonb_build_object('ok', true, 'message', badge_rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  raise exception 'That reward is not unlocked yet.';
end;
$function$;
