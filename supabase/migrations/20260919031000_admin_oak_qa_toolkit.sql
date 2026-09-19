-- Evolution / Oak QA Toolkit (admin-only). Grants are provenance-tagged ADMIN_QA.

create table if not exists public.admin_qa_grants (
  id bigserial primary key,
  admin_id uuid not null,
  target_user uuid not null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_qa_grants enable row level security;
drop policy if exists "admins read qa grants" on public.admin_qa_grants;
create policy "admins read qa grants" on public.admin_qa_grants
  for select to authenticated using (private.is_play_admin());
grant select on public.admin_qa_grants to authenticated;

create or replace function public.admin_oak_qa(p_action text, p_user uuid, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  admin uuid := auth.uid();
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  action text := upper(trim(coalesce(p_action, '')));
  dex int;
  qty int;
  i int;
  catch_id uuid;
  fam int;
  candy_amt int;
  grants jsonb := '{}'::jsonb;
  created int := 0;
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  warn boolean := false;
  c public.catches;
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
  if p_user is null then
    raise exception 'Pick a target Trainer.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Unknown Trainer.';
  end if;
  warn := p_user = sora;

  if action = 'GRANT_MON' then
    dex := (payload->>'dex')::int;
    qty := greatest(1, least(20, coalesce((payload->>'qty')::int, 1)));
    if dex is null or dex < 1 or dex > 151 then
      raise exception 'Pick a Kanto species (1–151).';
    end if;
    for i in 1..qty loop
      insert into public.catches (
        id, user_id, dex, name, variant, gender, level, favorite, locked,
        obtained_method, ot_user_id, ot_name, pokemon_form_id
      )
      values (
        gen_random_uuid(), p_user, dex,
        coalesce(payload->>'name', (select name from public.species where species.dex = dex), 'Pokémon'),
        case when coalesce((payload->>'shiny')::boolean, false) then 'shiny' else 'normal' end,
        coalesce(nullif(payload->>'gender', ''), 'Unknown'),
        greatest(1, least(100, coalesce((payload->>'level')::int, 10))),
        false, false, 'ADMIN_QA', p_user, 'ADMIN_QA',
        nullif(payload->>'formId', '')::int
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
    fam := coalesce((select family_id from public.species where dex = fam), fam);
    perform private.grant_family_candy(
      p_user, fam, candy_amt, 'ADMIN_QA', 'Oak Lab QA candy',
      jsonb_build_object('idempotency', 'qa-candy:' || admin::text || ':' || p_user::text || ':' || fam::text || ':' || clock_timestamp()::text)
    );
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_CANDY', jsonb_build_object('familyId', fam, 'amount', candy_amt, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'familyId', fam, 'amount', candy_amt, 'soraWarning', warn, 'message', 'Granted Evolution Candy.');

  elsif action = 'GRANT_ITEMS' then
    grants := coalesce(payload->'grants', '{}'::jsonb);
    perform private.ensure_inventory(p_user);
    perform private.grant_items(
      p_user, grants, 'ADMIN_QA', 'Oak Lab QA items',
      'qa-items:' || admin::text || ':' || p_user::text || ':' || clock_timestamp()::text, true
    );
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_ITEMS', jsonb_build_object('grants', grants, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'Granted QA evolution items.');

  elsif action = 'PRESET_OAK' then
    for dex, qty in
      select * from (values (113,2),(111,2),(25,2),(27,2),(133,3)) as t(d, q)
    loop
      for i in 1..qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (
          gen_random_uuid(), p_user, dex,
          (select name from public.species where species.dex = dex),
          'normal', 'Unknown', 12, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA'
        );
        created := created + 1;
      end loop;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_OAK', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Oak transfer preset: %s Pokémon.', created));

  elsif action = 'PRESET_EVO' then
    for dex, qty in
      select * from (values (25,1),(27,1),(133,3),(63,1),(64,1),(29,1),(32,1)) as t(d, q)
    loop
      for i in 1..qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (
          gen_random_uuid(), p_user, dex,
          (select name from public.species where species.dex = dex),
          'normal',
          case when dex = 29 then 'Female' when dex = 32 then 'Male' else 'Unknown' end,
          20, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA'
        );
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
    for catch_id in
      select x::uuid from jsonb_array_elements_text(coalesce(payload->'catchIds', '[]'::jsonb)) t(x)
    loop
      select * into c from public.catches
       where id = catch_id and user_id = p_user and transferred_at is null and obtained_method = 'ADMIN_QA'
       for update;
      if c.id is null then
        raise exception 'ADMIN_QA catch % missing for target.', catch_id;
      end if;
      select * into spec from public.species where dex = c.dex;
      fam := coalesce(spec.family_id, c.dex);
      select f.name, f.base_dex into fam_name, candy_base from public.evolution_families f where f.id = fam;
      if candy_base is null then
        candy_base := fam;
        fam_name := coalesce(spec.name, c.name);
      end if;
      candy_key := 'species-' || fam::text;
      pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
      if coalesce(c.is_alpha, false) or strpos(coalesce(c.variant, ''), 'shiny') > 0 then
        pay := pay + 1;
      end if;
      select coalesce(qty,0) into before_qty from public.family_candy where user_id = p_user and family_id = fam;
      perform private.grant_family_candy(
        p_user, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak',
        jsonb_build_object('idempotency', 'oak:' || c.id::text, 'catchId', c.id::text)
      );
      insert into public.oak_transfers (user_id, dex, catch_id, candy_key) values (p_user, c.dex, c.id, candy_key);
      update public.catches set transferred_at = now() where id = c.id;
      select coalesce(qty,0) into after_qty from public.family_candy where user_id = p_user and family_id = fam;
      proofs := proofs || jsonb_build_object(
        'catchId', c.id,
        'dex', c.dex,
        'name', c.name,
        'familyId', fam,
        'candyKey', candy_key,
        'candyGranted', pay,
        'candyBaseDex', candy_base,
        'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy',
        'balanceBefore', before_qty,
        'balanceAfter', after_qty
      );
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PROOF_TRANSFER', jsonb_build_object('proofs', proofs, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'proofs', proofs, 'soraWarning', warn);

  elsif action = 'RESET_QA' then
    delete from public.oak_transfers ot
     using public.catches c
     where ot.catch_id = c.id and c.user_id = p_user and c.obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger cl
     using public.catches c
     where cl.related_catch = c.id and c.user_id = p_user and c.obtained_method = 'ADMIN_QA';
    delete from public.catches where user_id = p_user and obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger where user_id = p_user and type = 'ADMIN_QA';
    update public.family_candy fc
       set qty = greatest(0, coalesce((
         select sum(cl.amount) from public.candy_ledger cl
          where cl.user_id = fc.user_id and cl.family_id = fc.family_id
       ), 0))
     where fc.user_id = p_user;
    delete from public.family_candy where user_id = p_user and qty <= 0;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'RESET_QA', jsonb_build_object('soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'ADMIN_QA catches and ADMIN_QA candy ledger rows cleared.');

  else
    raise exception 'Unknown Oak QA action.';
  end if;
end;
$function$;

revoke all on function public.admin_oak_qa(text, uuid, jsonb) from public, anon;
grant execute on function public.admin_oak_qa(text, uuid, jsonb) to authenticated;
