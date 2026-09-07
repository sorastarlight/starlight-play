create or replace function public.credit_bits_from_twitch(
  p_event_id text,
  p_login text,
  p_title text,
  p_bits int
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  login text := lower(btrim(coalesce(p_login, '')));
  sku text;
  item jsonb;
  trainer uuid;
  inserted text;
  note text;
begin
  if btrim(coalesce(p_event_id, '')) = '' then
    raise exception 'Missing Bits event id.';
  end if;
  sku := private.bits_sku(p_title, p_bits);
  insert into private.bits_events (event_id, twitch_login, sku, granted, detail)
  values (p_event_id, login, coalesce(sku, ''), false, '')
  on conflict (event_id) do nothing
  returning event_id into inserted;
  if inserted is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Already credited.');
  end if;
  if sku is null then
    note := 'Unknown Power-Up "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits).';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = sku;
  if item is null then
    note := 'Unknown Bits pack.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  if login = '' then
    note := 'Twitch did not send a viewer login.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = login;
  if trainer is null then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := (item->>'name') || ' is waiting. ' || login || ' needs to sign into Play once.';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end if;
  begin
    perform private.grant_known(trainer, item->'grants');
    note := 'Granted ' || (item->>'name') || ' to ' || login || '.';
    update private.bits_events set granted = true, detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', true, 'sku', sku, 'message', note);
  exception when others then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := sqlerrm;
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end;
end;
$$;

revoke all on function public.credit_bits_from_twitch(text, text, text, int) from public, anon, authenticated;
grant execute on function public.credit_bits_from_twitch(text, text, text, int) to service_role;
