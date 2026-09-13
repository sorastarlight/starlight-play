-- Award Candy/mastery on catch, keep trades from generating Candy, and extend achievements.

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $function$
declare
  cfg jsonb := private.progression_config();
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  catch_rate int;
  pay int;
begin
  perform private.ensure_inventory(new.user_id);
  perform private.ensure_trainer_stats(new.user_id);
  perform private.grant_xp(
    new.user_id, coalesce((cfg->>'catchXp')::int, 10), 'CAPTURE', 'Successful catch',
    jsonb_build_object('idempotency', 'xp-catch:' || new.id::text)
  );
  if new.round_id is not null then
    perform private.register_capture_collection(new);
  end if;

  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  if first_species then
    perform private.grant_xp(
      new.user_id, coalesce((cfg->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || new.user_id::text || ':' || new.dex::text)
    );
    update public.trainer_stats
       set first_pokemon_dex = coalesce(first_pokemon_dex, new.dex), updated_at = now()
     where user_id = new.user_id;
  end if;

  if new.gender = 'Female' and new.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_female;
    if first_female then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'firstFemaleXp')::int, 5), 'FIRST_FEMALE', 'First female variant',
        jsonb_build_object('idempotency', 'xp-female:' || new.user_id::text || ':' || new.dex::text)
      );
    end if;
  end if;

  if new.variant like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id and variant like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'shinyXp')::int, 50), 'SHINY', 'First shiny of this species',
        jsonb_build_object('idempotency', 'xp-shiny:' || new.user_id::text || ':' || new.dex::text)
      );
      update public.trainer_stats
         set first_shiny_dex = coalesce(first_shiny_dex, new.dex), updated_at = now()
       where user_id = new.user_id;
    end if;
  end if;

  select s.catch_rate into catch_rate from public.species s where s.dex = new.dex;
  if exists (select 1 from public.species s where s.dex = new.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryXp')::int, 25);
  elsif coalesce(catch_rate, 255) <= 9 then
    pay := coalesce((cfg->>'ultraRareXp')::int, 15);
  elsif coalesce(catch_rate, 255) <= 25 then
    pay := coalesce((cfg->>'veryRareXp')::int, 10);
  elsif coalesce(catch_rate, 255) <= 75 then
    pay := coalesce((cfg->>'rareXp')::int, 5);
  else
    pay := 0;
  end if;
  if pay > 0 then
    perform private.grant_xp(
      new.user_id, pay, 'RARITY', 'Rare capture bonus',
      jsonb_build_object('idempotency', 'xp-rare:' || coalesce(new.id::text, new.dex::text))
    );
  end if;
  return new;
end;
$function$;

create or replace function private.mark_trade_receive(p_uid uuid, p_catch uuid, p_from uuid)
returns void
language plpgsql
as $function$
declare
  c public.catches;
  owned_before boolean;
begin
  select * into c from public.catches where id = p_catch;
  select exists (select 1 from public.catches x where x.user_id = p_uid and x.dex = c.dex and x.id <> c.id) into owned_before;
  update public.catches
     set obtained_method = 'TRADE',
         trade_evo_ready = exists (
           select 1 from public.evolution_rules r
            where r.from_dex = c.dex and r.enabled
              and r.condition_type in ('TRADE','TRADE_OR_ITEM')
         ),
         trade_locked_until = now() + interval '5 minutes'
   where id = p_catch;
  if not owned_before then
    perform private.grant_xp(p_uid, coalesce((private.progression_config()->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || p_uid::text || ':' || c.dex::text));
    if coalesce((private.economy_config()->>'newDexReward')::int, 0) > 0 then
      perform private.adjust_coins(
        p_uid, coalesce((private.economy_config()->>'newDexReward')::int, 100), 'NEW_DEX_ENTRY', 'First time owning this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || c.dex::text)
      );
    end if;
    perform private.maybe_grant_dex_milestones(p_uid);
  end if;
end;
$function$;

create or replace function private.trade_xp(p_uid uuid, p_trade text)
returns void
language plpgsql
as $function$
declare
  today text := to_char((now() at time zone 'America/New_York')::date, 'YYYY-MM-DD');
  granted int;
begin
  select count(*)::int into granted
    from public.xp_ledger
   where user_id = p_uid and type = 'TRADE'
     and created_at >= date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York';
  if granted >= 3 then
    return;
  end if;
  perform private.grant_xp(p_uid, 5, 'TRADE', 'Completed a trade',
    jsonb_build_object('idempotency', 'xp-trade:' || p_uid::text || ':' || p_trade));
end;
$function$;

create or replace function public.play_trade_accept(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  o public.trade_offers;
  l public.trade_listings;
  listed public.catches;
  offered public.catches;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into o from public.trade_offers where id = p_offer_id and status = 'pending' for update;
  if o.id is null then raise exception 'That offer is gone.'; end if;
  select * into l from public.trade_listings where id = o.listing_id and user_id = uid and status = 'open' for update;
  if l.id is null then raise exception 'Only the listing trainer can accept, and the listing must still be open.'; end if;
  select * into listed from public.catches where id = l.catch_id and user_id = uid and transferred_at is null for update;
  select * into offered from public.catches where id = o.catch_id and user_id = o.user_id and transferred_at is null for update;
  if listed.id is null or offered.id is null then
    raise exception 'One of those Pokémon is no longer available.';
  end if;
  if listed.locked or listed.favorite or offered.locked or offered.favorite then
    raise exception 'A locked or favorite Pokémon cannot be traded.';
  end if;
  if exists (select 1 from public.species s where s.dex = listed.dex and s.tradable = false)
     or exists (select 1 from public.species s where s.dex = offered.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  update public.catches set user_id = o.user_id where id = listed.id;
  update public.catches set user_id = uid where id = offered.id;
  perform private.pull_from_team(uid, listed.id);
  perform private.pull_from_team(o.user_id, offered.id);
  perform private.mark_trade_receive(o.user_id, listed.id, uid);
  perform private.mark_trade_receive(uid, offered.id, o.user_id);
  update public.trainer_stats set trades_done = trades_done + 1, traded_away = traded_away + 1, traded_in = traded_in + 1, updated_at = now() where user_id = uid;
  update public.trainer_stats set trades_done = trades_done + 1, traded_away = traded_away + 1, traded_in = traded_in + 1, updated_at = now() where user_id = o.user_id;
  perform private.trade_xp(uid, 'gts:' || l.id::text);
  perform private.trade_xp(o.user_id, 'gts:' || l.id::text);
  update public.trade_listings set status = 'completed' where id = l.id;
  update public.trade_offers set status = 'accepted' where id = o.id;
  update public.trade_offers set status = 'declined' where listing_id = l.id and status = 'pending';
  update public.trade_listings set status = 'cancelled' where catch_id in (listed.id, offered.id) and status = 'open';
  update public.trade_offers set status = 'declined' where status = 'pending' and catch_id in (listed.id, offered.id);
  perform private.evaluate_achievements(uid, true);
  perform private.evaluate_achievements(o.user_id, true);
  return jsonb_build_object('ok', true, 'message', 'Trade complete. The Pokémon swapped trainers.');
end;
$function$;

create or replace function private.achievement_progress(p_uid uuid, p_row public.progression_achievements)
returns int
language plpgsql
stable
as $function$
declare
  extra jsonb := coalesce(p_row.extra, '{}'::jsonb);
  n int := 0;
begin
  if p_row.requirement_type = 'TOTAL_CATCHES' then
    select count(*)::int into n from public.catches where user_id = p_uid and round_id is not null;
  elsif p_row.requirement_type = 'UNIQUE_SPECIES' then
    select count(distinct dex)::int into n from public.catches where user_id = p_uid;
  elsif p_row.requirement_type = 'SHINY_SPECIES' then
    select count(distinct dex)::int into n from public.catches where user_id = p_uid and variant like '%shiny%';
  elsif p_row.requirement_type = 'FEMALE_VARIANTS' then
    select count(distinct c.dex)::int into n from public.catches c
     where c.user_id = p_uid and (c.variant like '%female%' or c.gender = 'Female') and c.dex = any (private.female_visual_dex());
  elsif p_row.requirement_type = 'ENCOUNTERS_JOINED' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid;
  elsif p_row.requirement_type = 'HONEY_CONTRIBUTIONS' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid and prep = 'bait';
  elsif p_row.requirement_type = 'SPECIALIST_BALL_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success and ball_condition_met and ball_key = extra->>'ball';
  elsif p_row.requirement_type = 'OPTIMAL_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success and ball_condition_met
      and ball_key not in ('pokeball','greatball','ultraball','masterball','premierball');
  elsif p_row.requirement_type = 'RARITY_CAPTURES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success
      and canonical_catch_rate <= coalesce((extra->>'maxCatchRate')::int, 255)
      and canonical_catch_rate >= coalesce((extra->>'minCatchRate')::int, 0);
  elsif p_row.requirement_type = 'LEGENDARY_CATCHES' then
    select count(*)::int into n from public.catches c join public.species s on s.dex = c.dex where c.user_id = p_uid and s.is_legendary;
  elsif p_row.requirement_type = 'LOW_ODDS_CAPTURE' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success
      and final_chance <= coalesce((extra->>'maxChance')::numeric, 0.05);
  elsif p_row.requirement_type = 'SPECIES_CATCH_COUNT' then
    select coalesce(max(cnt), 0) into n from (select count(*)::int as cnt from public.catches where user_id = p_uid group by dex) s;
  elsif p_row.requirement_type = 'FAILED_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success = false;
  elsif p_row.requirement_type = 'CATCH_STREAK' then
    select coalesce(best_catch_streak, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'EVOLUTIONS' then
    select coalesce(evolved, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'TRADES' then
    select coalesce(trades_done, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'SPECIES_MASTERED' then
    select count(*)::int into n from public.species_mastery where user_id = p_uid and rank >= 5;
  elsif p_row.requirement_type = 'DUPLICATE_CATCHES' then
    select coalesce(sum(cnt - 1), 0)::int into n from (
      select count(*)::int as cnt from public.catches where user_id = p_uid and round_id is not null group by dex
    ) s where cnt > 1;
  else
    n := 0;
  end if;
  return coalesce(n, 0);
end;
$function$;
