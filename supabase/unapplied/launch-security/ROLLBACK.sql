-- Restores original bodies and anonymous/PUBLIC permissions, including known risks.
-- Emergency review only; never automatically execute.
begin;
CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.settle_due_rounds();
  return coalesce(private.admin_overview(), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(250));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_pass(p_login text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
    set starlight_pass = p_active,
        pass_source = case when p_active then 'admin' else null end,
        pass_checked_at = now(),
        updated_at = now()
    where lower(twitch_login) = lower(btrim(p_login));
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', case when p_active then 'Starlight Pass granted.' else 'Starlight Pass removed.' end
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_grant_bits_pack(p_login text, p_sku text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  item jsonb;
  trainer uuid;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'Unknown Bits pack.';
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = lower(btrim(p_login));
  if trainer is null then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  perform private.grant_known(trainer, item->'grants');
  return jsonb_build_object('ok', true, 'message', 'Granted ' || (item->>'name') || ' to ' || btrim(p_login) || '.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_oak_qa(p_action text, p_user uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin uuid := auth.uid();
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  action text := upper(trim(coalesce(p_action, '')));
  mon_dex int;
  mon_qty int;
  i int;
  catch_id uuid;
  fam int;
  candy_amt int;
  grants jsonb := '{}'::jsonb;
  created int := 0;
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  warn boolean := false;
  catch_row public.catches;
  spec public.species;
  fam_name text;
  candy_base int;
  pay int := 0;
  candy_key text;
  proofs jsonb := '[]'::jsonb;
  before_qty int;
  after_qty int;
begin
  if admin is null or not private.is_play_admin() then
    raise exception 'Admin only.' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'Pick a target Trainer.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown Trainer.'; end if;
  warn := p_user = sora;

  if action = 'GRANT_MON' then
    mon_dex := (payload->>'dex')::int;
    mon_qty := greatest(1, least(20, coalesce((payload->>'qty')::int, 1)));
    if mon_dex is null or mon_dex < 1 or mon_dex > 151 then raise exception 'Pick a Kanto species (1–151).'; end if;
    for i in 1..mon_qty loop
      insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name, pokemon_form_id)
      values (
        gen_random_uuid(), p_user, mon_dex,
        coalesce(payload->>'name', (select s.name from public.species s where s.dex = mon_dex), 'Pokémon'),
        case when coalesce((payload->>'shiny')::boolean, false) then 'shiny' else 'normal' end,
        coalesce(nullif(payload->>'gender', ''), 'Unknown'),
        greatest(1, least(100, coalesce((payload->>'level')::int, 10))),
        false, false, 'ADMIN_QA', p_user, 'ADMIN_QA', nullif(payload->>'formId', '')::int
      );
      created := created + 1;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_MON', payload || jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Granted %s ADMIN_QA Pokémon.', created));

  elsif action = 'GRANT_CANDY' then
    fam := coalesce((payload->>'familyId')::int, (payload->>'dex')::int);
    candy_amt := greatest(1, least(999, coalesce((payload->>'amount')::int, 1)));
    if fam is null then raise exception 'Pick an Evolution Line.'; end if;
    fam := coalesce((select s.family_id from public.species s where s.dex = fam), fam);
    perform private.grant_family_candy(p_user, fam, candy_amt, 'ADMIN_QA', 'Oak Lab QA candy',
      jsonb_build_object('idempotency', 'qa-candy:' || admin::text || ':' || p_user::text || ':' || fam::text || ':' || clock_timestamp()::text));
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_CANDY', jsonb_build_object('familyId', fam, 'amount', candy_amt, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'familyId', fam, 'amount', candy_amt, 'soraWarning', warn, 'message', 'Granted Evolution Candy.');

  elsif action = 'GRANT_ITEMS' then
    grants := coalesce(payload->'grants', '{}'::jsonb);
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, grants, 'ADMIN_QA', 'Oak Lab QA items',
      'qa-items:' || admin::text || ':' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_ITEMS', jsonb_build_object('grants', grants, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'Granted QA evolution items.');

  elsif action = 'PRESET_OAK' then
    for mon_dex, mon_qty in select * from (values (113,2),(111,2),(25,2),(27,2),(133,3)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal', 'Unknown', 12, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_OAK', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Oak transfer preset: %s Pokémon.', created));

  elsif action = 'PRESET_EVO' then
    for mon_dex, mon_qty in select * from (values (25,1),(27,1),(133,3),(63,1),(64,1),(29,1),(32,1)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal',
          case when mon_dex = 29 then 'Female' when mon_dex = 32 then 'Male' else 'Unknown' end, 20, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    perform private.grant_family_candy(p_user, 25, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-pika:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 27, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-sand:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 133, 80, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-eevee:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 63, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-abra:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, jsonb_build_object(
      'thunderstone', 2, 'firestone', 2, 'waterstone', 2, 'leafstone', 2, 'moonstone', 2,
      'linkingcord', 2, 'rarecandy', 5
    ), 'ADMIN_QA', 'QA evo kit', 'qa-evo-items:' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_EVO', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', 'Kanto evolution QA kit granted.');

  elsif action = 'PROOF_TRANSFER' then
    for catch_id in select x::uuid from jsonb_array_elements_text(coalesce(payload->'catchIds', '[]'::jsonb)) t(x) loop
      select * into catch_row from public.catches
       where id = catch_id and user_id = p_user and transferred_at is null and obtained_method = 'ADMIN_QA' for update;
      if catch_row.id is null then raise exception 'ADMIN_QA catch % missing for target.', catch_id; end if;
      select * into spec from public.species where species.dex = catch_row.dex;
      fam := coalesce(spec.family_id, catch_row.dex);
      select f.name, f.base_dex into fam_name, candy_base from public.evolution_families f where f.id = fam;
      if candy_base is null then candy_base := fam; fam_name := coalesce(spec.name, catch_row.name); end if;
      candy_key := 'species-' || fam::text;
      pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
      if coalesce(catch_row.is_alpha, false) or strpos(coalesce(catch_row.variant, ''), 'shiny') > 0 then pay := pay + 1; end if;
      select coalesce(fc.qty,0) into before_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      perform private.grant_family_candy(p_user, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak',
        jsonb_build_object('idempotency', 'oak:' || catch_row.id::text, 'catchId', catch_row.id::text));
      insert into public.oak_transfers (user_id, dex, catch_id, candy_key) values (p_user, catch_row.dex, catch_row.id, candy_key);
      update public.catches set transferred_at = now() where id = catch_row.id;
      select coalesce(fc.qty,0) into after_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      proofs := proofs || jsonb_build_object('catchId', catch_row.id, 'dex', catch_row.dex, 'name', catch_row.name, 'familyId', fam, 'candyKey', candy_key, 'candyGranted', pay, 'candyBaseDex', candy_base, 'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy', 'balanceBefore', before_qty, 'balanceAfter', after_qty);
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PROOF_TRANSFER', jsonb_build_object('proofs', proofs, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'proofs', proofs, 'soraWarning', warn);

  elsif action = 'RESET_QA' then
    delete from public.oak_transfers ot using public.catches qa where ot.catch_id = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger cl using public.catches qa where cl.related_catch = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.catches where user_id = p_user and obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger where user_id = p_user and type = 'ADMIN_QA';
    update public.family_candy fc set qty = greatest(0, coalesce((select sum(cl.amount) from public.candy_ledger cl where cl.user_id = fc.user_id and cl.family_id = fc.family_id), 0)) where fc.user_id = p_user;
    delete from public.family_candy fc2 where fc2.user_id = p_user and fc2.qty <= 0;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'RESET_QA', jsonb_build_object('soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'ADMIN_QA catches and ADMIN_QA candy ledger rows cleared.');

  else
    raise exception 'Unknown Oak QA action.';
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_qa_grant_pass_reward(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin uuid := auth.uid();
  kind text := lower(btrim(coalesce(p_kind, '')));
  v_grants jsonb;
  label text;
  supply jsonb;
  berry jsonb;
begin
  if admin is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if kind not in ('daily', 'weekly', 'supply') then
    raise exception 'Unknown Pass QA reward kind.';
  end if;
  if kind = 'supply' then
    supply := private.economy_config()->'dailySupply';
    berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
    if berry is null or (berry->>'item') = 'goldenrazz' then
      berry := jsonb_build_object('item', 'berry', 'qty', 1);
    end if;
    v_grants := jsonb_build_object(
        'pokeball', coalesce((supply->>'pokeball')::int, 3),
        berry->>'item', coalesce((supply->>'berry')::int, 1),
        'coins', coalesce((supply->>'coins')::int, 50)
      ) || coalesce(private.daily_streak_bonus(1), '{}'::jsonb);
    label := 'ADMIN QA Daily Trainer Supply';
  else
    v_grants := private.pass_reward_grants(kind);
    label := case when kind = 'daily' then 'ADMIN QA Daily Pass' else 'ADMIN QA Weekly Pass' end;
  end if;
  if v_grants is null or v_grants = '{}'::jsonb then
    raise exception 'QA reward bundle is empty.';
  end if;
  perform private.grant_items(
    admin,
    v_grants,
    'ADMIN_QA',
    'pass-qa-' || kind,
    'admin-pass-qa:' || admin::text || ':' || kind || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    true
  );
  insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
  values (
    admin,
    admin,
    'PASS_REWARD_QA',
    jsonb_build_object('passKind', kind, 'grants', v_grants, 'label', label)
  );
  return private.play_snapshot(admin) || jsonb_build_object(
    'ok', true,
    'qa', true,
    'kind', kind,
    'grants', v_grants,
    'message', label || ' granted: ' || private.grant_summary(v_grants) || '.'
  );
end;
$function$
;
revoke execute on function public.admin_advance_phase() from public, anon;
grant execute on function public.admin_advance_phase() to public;
grant execute on function public.admin_advance_phase() to anon;
revoke execute on function public.admin_bits_events(text, integer) from public, anon;
grant execute on function public.admin_bits_events(text, integer) to public;
grant execute on function public.admin_bits_events(text, integer) to anon;
revoke execute on function public.admin_bits_health() from public, anon;
grant execute on function public.admin_bits_health() to public;
grant execute on function public.admin_bits_health() to anon;
revoke execute on function public.admin_bits_qa_redemption(text, text, integer, text) from public, anon;
grant execute on function public.admin_bits_qa_redemption(text, text, integer, text) to public;
grant execute on function public.admin_bits_qa_redemption(text, text, integer, text) to anon;
revoke execute on function public.admin_bits_retry(text) from public, anon;
grant execute on function public.admin_bits_retry(text) to public;
grant execute on function public.admin_bits_retry(text) to anon;
revoke execute on function public.admin_build_health() from public, anon;
grant execute on function public.admin_build_health() to public;
grant execute on function public.admin_build_health() to anon;
revoke execute on function public.admin_cancel_round() from public, anon;
grant execute on function public.admin_cancel_round() to public;
grant execute on function public.admin_cancel_round() to anon;
revoke execute on function public.admin_candy_simulate(integer, integer) from public, anon;
grant execute on function public.admin_candy_simulate(integer, integer) to public;
grant execute on function public.admin_candy_simulate(integer, integer) to anon;
revoke execute on function public.admin_capture_health() from public, anon;
grant execute on function public.admin_capture_health() to public;
grant execute on function public.admin_capture_health() to anon;
revoke execute on function public.admin_capture_overview() from public, anon;
grant execute on function public.admin_capture_overview() to public;
grant execute on function public.admin_capture_overview() to anon;
revoke execute on function public.admin_capture_report(integer) from public, anon;
grant execute on function public.admin_capture_report(integer) to public;
grant execute on function public.admin_capture_report(integer) to anon;
revoke execute on function public.admin_capture_round(uuid) from public, anon;
grant execute on function public.admin_capture_round(uuid) to public;
grant execute on function public.admin_capture_round(uuid) to anon;
revoke execute on function public.admin_capture_save_balance(jsonb) from public, anon;
grant execute on function public.admin_capture_save_balance(jsonb) to public;
grant execute on function public.admin_capture_save_balance(jsonb) to anon;
revoke execute on function public.admin_capture_save_ball(text, jsonb) from public, anon;
grant execute on function public.admin_capture_save_ball(text, jsonb) to public;
grant execute on function public.admin_capture_save_ball(text, jsonb) to anon;
revoke execute on function public.admin_capture_save_berry(text, jsonb) from public, anon;
grant execute on function public.admin_capture_save_berry(text, jsonb) to public;
grant execute on function public.admin_capture_save_berry(text, jsonb) to anon;
revoke execute on function public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer) from public, anon;
grant execute on function public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer) to public;
grant execute on function public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer) to anon;
revoke execute on function public.admin_clear_round() from public, anon;
grant execute on function public.admin_clear_round() to public;
grant execute on function public.admin_clear_round() to anon;
revoke execute on function public.admin_collection_overview() from public, anon;
grant execute on function public.admin_collection_overview() to public;
grant execute on function public.admin_collection_overview() to anon;
revoke execute on function public.admin_content_health() from public, anon;
grant execute on function public.admin_content_health() to public;
grant execute on function public.admin_content_health() to anon;
revoke execute on function public.admin_content_picker(text, text) from public, anon;
grant execute on function public.admin_content_picker(text, text) to public;
grant execute on function public.admin_content_picker(text, text) to anon;
revoke execute on function public.admin_content_studio() from public, anon;
grant execute on function public.admin_content_studio() to public;
grant execute on function public.admin_content_studio() to anon;
revoke execute on function public.admin_delete_event(uuid) from public, anon;
grant execute on function public.admin_delete_event(uuid) to public;
grant execute on function public.admin_delete_event(uuid) to anon;
revoke execute on function public.admin_economy_health() from public, anon;
grant execute on function public.admin_economy_health() to public;
grant execute on function public.admin_economy_health() to anon;
revoke execute on function public.admin_economy_overview() from public, anon;
grant execute on function public.admin_economy_overview() to public;
grant execute on function public.admin_economy_overview() to anon;
revoke execute on function public.admin_economy_save(jsonb) from public, anon;
grant execute on function public.admin_economy_save(jsonb) to public;
grant execute on function public.admin_economy_save(jsonb) to anon;
revoke execute on function public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text) from public, anon;
grant execute on function public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text) to public;
grant execute on function public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text) to anon;
revoke execute on function public.admin_evolution_validate() from public, anon;
grant execute on function public.admin_evolution_validate() to public;
grant execute on function public.admin_evolution_validate() to anon;
revoke execute on function public.admin_game_health() from public, anon;
grant execute on function public.admin_game_health() to public;
grant execute on function public.admin_game_health() to anon;
revoke execute on function public.admin_grant_achievement(uuid, text) from public, anon;
grant execute on function public.admin_grant_achievement(uuid, text) to public;
grant execute on function public.admin_grant_achievement(uuid, text) to anon;
revoke execute on function public.admin_grant_badge(uuid, text, text) from public, anon;
grant execute on function public.admin_grant_badge(uuid, text, text) to public;
grant execute on function public.admin_grant_badge(uuid, text, text) to anon;
revoke execute on function public.admin_grant_bag(uuid, jsonb) from public, anon;
grant execute on function public.admin_grant_bag(uuid, jsonb) to public;
grant execute on function public.admin_grant_bag(uuid, jsonb) to anon;
revoke execute on function public.admin_grant_bits_pack(text, text) from public, anon;
grant execute on function public.admin_grant_bits_pack(text, text) to public;
grant execute on function public.admin_grant_bits_pack(text, text) to anon;
revoke execute on function public.admin_grant_cosmetic(uuid, text, text) from public, anon;
grant execute on function public.admin_grant_cosmetic(uuid, text, text) to public;
grant execute on function public.admin_grant_cosmetic(uuid, text, text) to anon;
revoke execute on function public.admin_grant_pokemon(uuid, integer, text, text, boolean, text) from public, anon;
grant execute on function public.admin_grant_pokemon(uuid, integer, text, text, boolean, text) to public;
grant execute on function public.admin_grant_pokemon(uuid, integer, text, text, boolean, text) to anon;
revoke execute on function public.admin_grant_title(uuid, text, text) from public, anon;
grant execute on function public.admin_grant_title(uuid, text, text) to public;
grant execute on function public.admin_grant_title(uuid, text, text) to anon;
revoke execute on function public.admin_grant_valuable(uuid, text, integer) from public, anon;
grant execute on function public.admin_grant_valuable(uuid, text, integer) to anon;
revoke execute on function public.admin_hide_round(boolean) from public, anon;
grant execute on function public.admin_hide_round(boolean) to public;
grant execute on function public.admin_hide_round(boolean) to anon;
revoke execute on function public.admin_identity_inspect(uuid) from public, anon;
grant execute on function public.admin_identity_inspect(uuid) to public;
grant execute on function public.admin_identity_inspect(uuid) to anon;
revoke execute on function public.admin_issue_bridge_token() from public, anon;
grant execute on function public.admin_issue_bridge_token() to public;
grant execute on function public.admin_issue_bridge_token() to anon;
revoke execute on function public.admin_item_library(text, text) from public, anon;
grant execute on function public.admin_item_library(text, text) to public;
grant execute on function public.admin_item_library(text, text) to anon;
revoke execute on function public.admin_list_users(text, integer) from public, anon;
grant execute on function public.admin_list_users(text, integer) to public;
grant execute on function public.admin_list_users(text, integer) to anon;
revoke execute on function public.admin_loot_overview() from public, anon;
grant execute on function public.admin_loot_overview() to anon;
revoke execute on function public.admin_loot_save_config(jsonb) from public, anon;
grant execute on function public.admin_loot_save_config(jsonb) to anon;
revoke execute on function public.admin_loot_save_entry(uuid, integer, integer, integer, boolean) from public, anon;
grant execute on function public.admin_loot_save_entry(uuid, integer, integer, integer, boolean) to anon;
revoke execute on function public.admin_loot_self_test() from public, anon;
grant execute on function public.admin_loot_self_test() to anon;
revoke execute on function public.admin_loot_simulate(integer, numeric, numeric, numeric) from public, anon;
grant execute on function public.admin_loot_simulate(integer, numeric, numeric, numeric) to anon;
revoke execute on function public.admin_loot_tables() from public, anon;
grant execute on function public.admin_loot_tables() to anon;
revoke execute on function public.admin_oak_research_reset(uuid) from public, anon;
grant execute on function public.admin_oak_research_reset(uuid) to anon;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to anon;
revoke execute on function public.admin_pokemon_forms(integer) from public, anon;
grant execute on function public.admin_pokemon_forms(integer) to public;
grant execute on function public.admin_pokemon_forms(integer) to anon;
revoke execute on function public.admin_progression_overview() from public, anon;
grant execute on function public.admin_progression_overview() to public;
grant execute on function public.admin_progression_overview() to anon;
revoke execute on function public.admin_progression_save(jsonb) from public, anon;
grant execute on function public.admin_progression_save(jsonb) to public;
grant execute on function public.admin_progression_save(jsonb) to anon;
revoke execute on function public.admin_qa_grant_pass_reward(text) from public, anon;
grant execute on function public.admin_qa_grant_pass_reward(text) to anon;
revoke execute on function public.admin_queue_stream_command(text, jsonb) from public, anon;
grant execute on function public.admin_queue_stream_command(text, jsonb) to public;
grant execute on function public.admin_queue_stream_command(text, jsonb) to anon;
revoke execute on function public.admin_refill_test() from public, anon;
grant execute on function public.admin_refill_test() to public;
grant execute on function public.admin_refill_test() to anon;
revoke execute on function public.admin_remove_pokemon(uuid, uuid) from public, anon;
grant execute on function public.admin_remove_pokemon(uuid, uuid) to public;
grant execute on function public.admin_remove_pokemon(uuid, uuid) to anon;
revoke execute on function public.admin_revoke_cosmetic(uuid, text, text) from public, anon;
grant execute on function public.admin_revoke_cosmetic(uuid, text, text) to public;
grant execute on function public.admin_revoke_cosmetic(uuid, text, text) to anon;
revoke execute on function public.admin_save_channel(text, text, text) from public, anon;
grant execute on function public.admin_save_channel(text, text, text) to public;
grant execute on function public.admin_save_channel(text, text, text) to anon;
revoke execute on function public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
grant execute on function public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone) to public;
grant execute on function public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone) to anon;
revoke execute on function public.admin_save_game_settings(jsonb) from public, anon;
grant execute on function public.admin_save_game_settings(jsonb) to public;
grant execute on function public.admin_save_game_settings(jsonb) to anon;
revoke execute on function public.admin_save_github_token(text) from public, anon;
grant execute on function public.admin_save_github_token(text) to public;
grant execute on function public.admin_save_github_token(text) to anon;
revoke execute on function public.admin_save_item_identity(text, jsonb) from public, anon;
grant execute on function public.admin_save_item_identity(text, jsonb) to public;
grant execute on function public.admin_save_item_identity(text, jsonb) to anon;
revoke execute on function public.admin_save_look_portrait(text, text, jsonb, text) from public, anon;
grant execute on function public.admin_save_look_portrait(text, text, jsonb, text) to public;
grant execute on function public.admin_save_look_portrait(text, text, jsonb, text) to anon;
revoke execute on function public.admin_save_pass_rewards(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_pass_rewards(jsonb, jsonb) to public;
grant execute on function public.admin_save_pass_rewards(jsonb, jsonb) to anon;
revoke execute on function public.admin_save_twitch_client_secret(text) from public, anon;
grant execute on function public.admin_save_twitch_client_secret(text) to public;
grant execute on function public.admin_save_twitch_client_secret(text) to anon;
revoke execute on function public.admin_set_coins(uuid, integer) from public, anon;
grant execute on function public.admin_set_coins(uuid, integer) to public;
grant execute on function public.admin_set_coins(uuid, integer) to anon;
revoke execute on function public.admin_set_pass(text, boolean) from public, anon;
grant execute on function public.admin_set_pass(text, boolean) to public;
grant execute on function public.admin_set_pass(text, boolean) to anon;
revoke execute on function public.admin_set_ranking_visible(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_ranking_visible(uuid, boolean, text) to public;
grant execute on function public.admin_set_ranking_visible(uuid, boolean, text) to anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to public;
grant execute on function public.admin_set_role(uuid, text) to anon;
revoke execute on function public.admin_set_twitch_flags(uuid, text, boolean, boolean, text) from public, anon;
grant execute on function public.admin_set_twitch_flags(uuid, text, boolean, boolean, text) to public;
grant execute on function public.admin_set_twitch_flags(uuid, text, boolean, boolean, text) to anon;
revoke execute on function public.admin_set_twitch_primary(uuid, text) from public, anon;
grant execute on function public.admin_set_twitch_primary(uuid, text) to public;
grant execute on function public.admin_set_twitch_primary(uuid, text) to anon;
revoke execute on function public.admin_set_xp(uuid, integer) from public, anon;
grant execute on function public.admin_set_xp(uuid, integer) to public;
grant execute on function public.admin_set_xp(uuid, integer) to anon;
revoke execute on function public.admin_start_round(integer, text, boolean, integer) from public, anon;
grant execute on function public.admin_start_round(integer, text, boolean, integer) to public;
grant execute on function public.admin_start_round(integer, text, boolean, integer) to anon;
revoke execute on function public.admin_store_delete_category(uuid) from public, anon;
grant execute on function public.admin_store_delete_category(uuid) to public;
grant execute on function public.admin_store_delete_category(uuid) to anon;
revoke execute on function public.admin_store_delete_item(text) from public, anon;
grant execute on function public.admin_store_delete_item(text) to public;
grant execute on function public.admin_store_delete_item(text) to anon;
revoke execute on function public.admin_store_duplicate_item(text) from public, anon;
grant execute on function public.admin_store_duplicate_item(text) to public;
grant execute on function public.admin_store_duplicate_item(text) to anon;
revoke execute on function public.admin_store_get() from public, anon;
grant execute on function public.admin_store_get() to public;
grant execute on function public.admin_store_get() to anon;
revoke execute on function public.admin_store_register_asset(text, text, text) from public, anon;
grant execute on function public.admin_store_register_asset(text, text, text) to public;
grant execute on function public.admin_store_register_asset(text, text, text) to anon;
revoke execute on function public.admin_store_reorder(text, jsonb) from public, anon;
grant execute on function public.admin_store_reorder(text, jsonb) to public;
grant execute on function public.admin_store_reorder(text, jsonb) to anon;
revoke execute on function public.admin_store_save_category(jsonb) from public, anon;
grant execute on function public.admin_store_save_category(jsonb) to public;
grant execute on function public.admin_store_save_category(jsonb) to anon;
revoke execute on function public.admin_store_save_item(jsonb) from public, anon;
grant execute on function public.admin_store_save_item(jsonb) to public;
grant execute on function public.admin_store_save_item(jsonb) to anon;
revoke execute on function public.admin_store_save_look(jsonb) from public, anon;
grant execute on function public.admin_store_save_look(jsonb) to public;
grant execute on function public.admin_store_save_look(jsonb) to anon;
revoke execute on function public.admin_unlock_catch(uuid, text) from public, anon;
grant execute on function public.admin_unlock_catch(uuid, text) to public;
grant execute on function public.admin_unlock_catch(uuid, text) to anon;
revoke execute on function public.admin_user_account(uuid) from public, anon;
grant execute on function public.admin_user_account(uuid) to public;
grant execute on function public.admin_user_account(uuid) to anon;
commit;
