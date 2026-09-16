create or replace function public.admin_build_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  mig text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  begin
    select version into mig
    from supabase_migrations.schema_migrations
    order by version desc
    limit 1;
  exception when others then
    mig := null;
  end;
  return jsonb_build_object(
    'ok', true,
    'clientBuild', private.client_build(),
    'dbMigration', mig
  );
end;
$$;

grant execute on function public.admin_build_health() to authenticated;

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb)
       || jsonb_build_object('clientBuild', '20260916-rc3'),
       updated_at = now()
 where id = 1;
