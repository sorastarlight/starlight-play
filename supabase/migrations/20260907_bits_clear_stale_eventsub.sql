-- Clear leftover EventSub errors after a successful create, and stop showing
-- the old app-token failure once Twitch has accepted the webhook.

create or replace function public.bits_eventsub_mark(
  p_subscription_id text,
  p_status text,
  p_error text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update private.stream_bridge
    set eventsub_id = nullif(btrim(coalesce(p_subscription_id, '')), ''),
        eventsub_status = nullif(btrim(coalesce(p_status, '')), ''),
        eventsub_connected_at = case
          when btrim(coalesce(p_status, '')) = 'enabled' then now()
          else eventsub_connected_at
        end,
        last_bits_detail = case
          when btrim(coalesce(p_error, '')) = '' then ''
          else left(p_error, 400)
        end
    where id = 1;
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

update private.stream_bridge
  set last_bits_detail = ''
  where id = 1
    and last_bits_detail ilike '%app access token%';
