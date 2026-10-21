-- PROPOSAL ONLY. Requires explicit owner approval; batch catch approval excludes delivery.
-- Process exactly EmailQA's observed Caterpie event through the existing worker once.
begin;
set local lock_timeout='3s';
do $delivery$
declare v_delivered int; v_count bigint; v_profile text; v_inventory text; v_specimen text; v_activation jsonb;
begin
 lock table private.species_mastery_outbox in share row exclusive mode;
 if (select count(*) from private.species_mastery_outbox where status='pending')<>1 then raise exception 'Pending scope changed'; end if;
 if not exists(select 1 from private.species_mastery_outbox where catch_id='875c6f48-60b3-42c8-b540-370407839281' and status='pending' and attempts=0) then raise exception 'Expected QA row changed'; end if;
 if not exists(select 1 from public.catches where id='875c6f48-60b3-42c8-b540-370407839281' and user_id='15372f80-c560-4486-bf68-e997a73ac2b8' and dex=10 and round_id='a4716fd6-2b68-42bf-93f7-07a75e27b2fc') then raise exception 'QA identity changed'; end if;
 if exists(select 1 from public.species_mastery_events where catch_id='875c6f48-60b3-42c8-b540-370407839281') then raise exception 'Already delivered'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.deliver_species_mastery_outbox(integer)'::regprocedure) is distinct from 'c3e2401751521a93e3c98bd858e1cae9' then raise exception 'Worker drift'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.record_species_mastery_event(uuid)'::regprocedure) is distinct from '5e1402915cf10cfd0ca556eceaec4c7f' then raise exception 'Recorder drift'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.species_mastery_events_guard()'::regprocedure) is distinct from '18fe5a1d2d139aeddda60fc0c6db3713' then raise exception 'Event guard drift'; end if;
 perform 1 from private.species_mastery_activation where singleton for share;
 select to_jsonb(a) into v_activation from private.species_mastery_activation a where singleton;
 if v_activation->>'lifecycle' is distinct from 'active' or (v_activation->>'activated_at')::timestamptz is distinct from '2026-10-20T16:55:59.896904Z'::timestamptz then raise exception 'Lifecycle/cutoff changed'; end if;
 perform 1 from public.profiles where id='15372f80-c560-4486-bf68-e997a73ac2b8' for share;
 perform 1 from public.inventories where user_id='15372f80-c560-4486-bf68-e997a73ac2b8' for share;
 perform 1 from public.catches where id='875c6f48-60b3-42c8-b540-370407839281' for share;
 select md5(to_jsonb(p)::text) into v_profile from public.profiles p where id='15372f80-c560-4486-bf68-e997a73ac2b8';
 select md5(to_jsonb(i)::text) into v_inventory from public.inventories i where user_id='15372f80-c560-4486-bf68-e997a73ac2b8';
 select md5(to_jsonb(c)::text) into v_specimen from public.catches c where id='875c6f48-60b3-42c8-b540-370407839281';
 select count(*) into v_count from public.species_mastery_events;
 v_delivered := private.deliver_species_mastery_outbox(1);
 if v_delivered<>1 then raise exception 'Expected one successful delivery, got %; rollback',v_delivered; end if;
 if not exists(select 1 from private.species_mastery_outbox where catch_id='875c6f48-60b3-42c8-b540-370407839281' and status='delivered' and attempts=0 and delivered_at is not null) then raise exception 'Delivery state mismatch'; end if;
 if (select count(*) from public.species_mastery_events)<>v_count+1 or not exists(select 1 from public.species_mastery_events where catch_id='875c6f48-60b3-42c8-b540-370407839281' and trainer_id='15372f80-c560-4486-bf68-e997a73ac2b8' and dex=10) then raise exception 'Event scope mismatch'; end if;
 if (select md5(to_jsonb(p)::text) from public.profiles p where id='15372f80-c560-4486-bf68-e997a73ac2b8') is distinct from v_profile then raise exception 'Profile changed'; end if;
 if (select md5(to_jsonb(i)::text) from public.inventories i where user_id='15372f80-c560-4486-bf68-e997a73ac2b8') is distinct from v_inventory then raise exception 'Inventory changed'; end if;
 if (select md5(to_jsonb(c)::text) from public.catches c where id='875c6f48-60b3-42c8-b540-370407839281') is distinct from v_specimen then raise exception 'Specimen changed'; end if;
 if (select to_jsonb(a) from private.species_mastery_activation a where singleton) is distinct from v_activation then raise exception 'Lifecycle changed'; end if;
end $delivery$;
select trainer_id,dex,eligible_captures,tier_level,tier_name from public.species_mastery_progress where trainer_id='15372f80-c560-4486-bf68-e997a73ac2b8' and dex=10;
commit;
