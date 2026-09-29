-- P0: Pass claims fail because grant_items puts non-UUID p_source into relatedRound,
-- and adjust_coins casts relatedRound to uuid ("daily"/"weekly"/date strings).

create or replace function private.as_uuid_or_null(p_text text)
returns uuid
language plpgsql
immutable
as $function$
begin
  if p_text is null or btrim(p_text) = '' then
    return null;
  end if;
  if p_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return p_text::uuid;
exception when others then
  return null;
end;
$function$;

create or replace function private.adjust_coins(p_uid uuid, p_amount integer, p_type text, p_reason text default null, p_meta jsonb default '{}'::jsonb)
returns integer
language plpgsql
as $function$
declare
  before_bal int; after_bal int; idem text := nullif(p_meta->>'idempotency', ''); prior int;
begin
  if p_uid is null then raise exception 'Missing trainer.'; end if;
  if coalesce(p_amount, 0) = 0 then
    select coins into before_bal from public.inventories where user_id = p_uid for update;
    return coalesce(before_bal, 0);
  end if;
  if idem is not null then
    select balance_after into prior from public.coin_ledger where user_id = p_uid and idempotency = idem;
    if found then return prior; end if;
  end if;
  perform private.ensure_inventory(p_uid);
  select coins into before_bal from public.inventories where user_id = p_uid for update;
  after_bal := coalesce(before_bal, 0) + p_amount;
  if after_bal < 0 then raise exception 'Not enough PokéCoins.'; end if;
  update public.inventories set coins = after_bal, updated_at = now() where user_id = p_uid;
  insert into public.coin_ledger (user_id, amount, type, reason, related_item, related_sku, related_round, order_id, idempotency, balance_before, balance_after, detail, economy_version)
  values (
    p_uid,
    p_amount,
    p_type,
    p_reason,
    nullif(p_meta->>'relatedItem',''),
    nullif(p_meta->>'relatedSku',''),
    private.as_uuid_or_null(p_meta->>'relatedRound'),
    private.as_uuid_or_null(p_meta->>'orderId'),
    idem,
    coalesce(before_bal,0),
    after_bal,
    coalesce(p_meta,'{}'::jsonb),
    coalesce((private.economy_config()->>'economyBalanceVersion')::int, 1)
  );
  return after_bal;
exception when unique_violation then
  select balance_after into prior from public.coin_ledger where user_id = p_uid and idempotency = idem;
  return coalesce(prior, 0);
end;
$function$;

create or replace function private.grant_items(
  p_uid uuid,
  p_grants jsonb,
  p_reason text,
  p_source text default null,
  p_idem text default null,
  p_strict boolean default true
)
returns jsonb
language plpgsql
as $function$
declare
  grants jsonb := coalesce(p_grants, '{}'::jsonb);
  choice jsonb;
  coins int := 0;
  k text;
  n int;
  given jsonb := '{}'::jsonb;
  full_hit boolean := false;
  round_id text := case
    when private.as_uuid_or_null(p_source) is not null then p_source
    else null
  end;
begin
  if p_uid is null or grants = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'granted', '{}'::jsonb);
  end if;
  if p_idem is not null then
    insert into public.reward_events (user_id, idempotency, reason, source_id, grants)
    values (p_uid, p_idem, coalesce(p_reason, 'GRANT'), p_source, grants)
    on conflict (user_id, idempotency) do nothing;
    if not found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'granted', '{}'::jsonb);
    end if;
  end if;

  choice := grants->'_choice';
  coins := coalesce((grants->>'coins')::int, 0);
  grants := grants - 'coins' - 'title' - 'badge' - 'label' - 'idempotency' - 'key' - '_choice' - 'reason';

  if coalesce((grants->>'choice_stone')::int, 0) > 0 then
    perform private.open_choice_reward(
      p_uid,
      coalesce(p_idem, 'choice-stone:' || p_uid::text || ':' || coalesce(p_source, 'loot')),
      array['firestone','waterstone','thunderstone','leafstone','moonstone'],
      (grants->>'choice_stone')::int
    );
    grants := grants - 'choice_stone';
  end if;
  if choice is not null then
    perform private.open_choice_reward(
      p_uid,
      coalesce(choice->>'reward_key', p_idem, 'choice'),
      coalesce(array(select jsonb_array_elements_text(choice->'options')), array['firestone','waterstone','thunderstone','leafstone','moonstone']),
      greatest(coalesce((choice->>'remaining')::int, 1), 1)
    );
  end if;

  if grants <> '{}'::jsonb then
    begin
      perform private.grant_known(p_uid, grants);
      given := grants;
    exception when others then
      if p_strict or sqlerrm not ilike '%full%' then
        raise;
      end if;
      full_hit := true;
      for k, n in
        select key, greatest(coalesce(value::int, 0), 0)
          from jsonb_each_text(grants)
         where greatest(coalesce(value::int, 0), 0) > 0
      loop
        begin
          perform private.grant_known(p_uid, jsonb_build_object(k, n));
          given := given || jsonb_build_object(k, n);
        exception when others then
          if n > 1 then
            begin
              perform private.grant_known(p_uid, jsonb_build_object(k, 1));
              given := given || jsonb_build_object(k, 1);
            exception when others then
              null;
            end;
          end if;
        end;
      end loop;
      perform private.push_notice(
        p_uid, 'loot', 'Inventory limit reached.',
        'Some rewards could not be added. Use or store items, then keep playing.',
        jsonb_build_object('reason', p_reason)
      );
    end;
  end if;

  if coins <> 0 then
    perform private.adjust_coins(
      p_uid, coins, coalesce(p_reason, 'GRANT'), coalesce(p_reason, 'Reward'),
      jsonb_build_object(
        'idempotency', case when p_idem is null then null else p_idem || ':coins' end,
        'relatedRound', round_id
      )
    );
  end if;

  for k, n in
    select key, greatest(coalesce(value::int, 0), 0)
      from jsonb_each_text(given)
     where greatest(coalesce(value::int, 0), 0) > 0
       and key not in ('coins', 'title', 'badge')
  loop
    insert into public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
    values (
      p_uid, k, n, coalesce(p_reason, 'GRANT'), p_source,
      case when p_idem is null then null else p_idem || ':' || k end
    )
    on conflict do nothing;
  end loop;

  if (given ? 'masterball') and coalesce((given->>'masterball')::int, 0) > 0 then
    insert into public.play_console_log (kind, message)
    values (
      'milestone',
      '🏆 ' || coalesce(private.trainer_label(p_uid), 'A trainer') || ' earned a Master Ball!'
    );
  end if;

  return jsonb_build_object('ok', true, 'granted', given, 'full', full_hit, 'coins', coins);
end;
$function$;

create or replace function public.play_claim_pass(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
  grants jsonb;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.'; end if;
  inv := private.ensure_inventory(uid);
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    grants := private.pass_reward_grants('daily');
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    begin
      perform private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-daily',
        'pass-daily:' || uid::text || ':' || to_char(private.app_today(), 'YYYY-MM-DD'), true
      );
    exception when others then
      update public.inventories set pass_daily_at = inv.pass_daily_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Daily Pass gift: ' || private.grant_summary(grants) || '.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    grants := private.pass_reward_grants('weekly');
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    begin
      perform private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-weekly',
        'pass-weekly:' || uid::text || ':' || to_char(now(), 'IYYY-IW'), true
      );
    exception when others then
      update public.inventories set pass_weekly_at = inv.pass_weekly_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Weekly Pass crate: ' || private.grant_summary(grants) || '.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$function$;

revoke all on function public.play_claim_pass(text) from public;
grant execute on function public.play_claim_pass(text) to authenticated;
