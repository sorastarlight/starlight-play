-- Phase 7 follow-up: persist draft/publish status and pack kind on save.

create or replace function public.admin_store_save_item(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sku text;
  v_extra jsonb;
  v_pack text;
  v_kind text;
  v_status text;
  v_product text;
begin
  perform private.require_staff_edit();
  v_sku := btrim(coalesce(p_row->>'sku', ''));
  if v_sku = '' then
    raise exception 'Give this item a SKU.';
  end if;
  v_extra := coalesce(p_row->'extra', '{}'::jsonb);
  v_status := lower(btrim(coalesce(p_row->>'status', v_extra->>'status', 'published')));
  if v_status not in ('draft', 'published') then v_status := 'published'; end if;
  v_product := nullif(btrim(coalesce(p_row->>'productKind', v_extra->>'productKind', '')), '');
  if v_product is null then
    v_product := case
      when nullif(v_extra->>'pack','') is not null then 'avatar'
      when coalesce((p_row->>'bits')::int, 0) > 0 then 'bits'
      when jsonb_typeof(coalesce(p_row->'grants', '{}'::jsonb)) = 'object'
           and (select count(*) from jsonb_object_keys(coalesce(p_row->'grants', '{}'::jsonb))) > 1 then 'pack'
      else 'item'
    end;
  end if;
  v_extra := v_extra || jsonb_build_object(
    'status', v_status,
    'productKind', v_product,
    'detail', coalesce(p_row->>'detail', v_extra->>'detail')
  );
  select c.kind into v_kind
  from private.store_categories c
  where c.id = (p_row->>'categoryId')::uuid;
  if v_kind = 'avatars' then
    v_pack := nullif(btrim(coalesce(v_extra->>'pack', '')), '');
    if v_pack is null then
      v_pack := trim(both '-' from regexp_replace(lower(v_sku), '^avatar-', ''));
      if v_pack = '' then v_pack := v_sku; end if;
      v_extra := v_extra || jsonb_build_object('pack', v_pack);
    end if;
    if v_extra->'looks' is null or jsonb_typeof(v_extra->'looks') <> 'array' then
      v_extra := v_extra || jsonb_build_object('looks', '[]'::jsonb);
    end if;
    v_product := 'avatar';
    v_extra := v_extra || jsonb_build_object('productKind', 'avatar');
  end if;
  insert into private.store_items (
    sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra, status
  ) values (
    v_sku,
    (p_row->>'categoryId')::uuid,
    coalesce(nullif(p_row->>'name', ''), v_sku),
    coalesce(p_row->>'blurb', ''),
    coalesce((p_row->>'cost')::int, 0),
    coalesce((p_row->>'bits')::int, 0),
    private.validate_store_grants(coalesce(p_row->'grants', '{}'::jsonb)),
    coalesce(p_row->>'sprite', ''),
    coalesce(p_row->>'thumb', ''),
    coalesce((p_row->>'featured')::boolean, false),
    coalesce((p_row->>'sort')::int, 100),
    coalesce((p_row->>'visible')::boolean, true),
    v_extra,
    v_status
  )
  on conflict (sku) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    blurb = excluded.blurb,
    cost = excluded.cost,
    bits = excluded.bits,
    grants = excluded.grants,
    sprite = excluded.sprite,
    thumb = excluded.thumb,
    featured = excluded.featured,
    sort = excluded.sort,
    visible = excluded.visible,
    extra = excluded.extra,
    status = excluded.status;
  if v_kind = 'avatars' then
    perform private.sync_avatar_pack_looks(
      v_extra->>'pack',
      v_extra->'looks',
      coalesce(nullif(p_row->>'name', ''), v_sku),
      coalesce(v_extra->>'games', '')
    );
  end if;
  return public.admin_store_get() || jsonb_build_object('message', 'Item saved.', 'sku', v_sku, 'status', v_status);
end;
$function$;

grant execute on function public.admin_store_save_item(jsonb) to authenticated;
