-- Historical Evolution Candy family mapping reconciliation (data only).
-- Compensating ledger entries for confirmed misattributions from stale
-- family_candy_species_id. Does not rewrite original ledger rows.
-- Authorized: sorastarlight, twinklephoenixstar only.
-- Idempotent via hist-candy-recon:20260919:* keys.

do $recon$
declare
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  twinkle uuid := 'da777b13-6879-44a8-99f4-a154e54d3d75';
  q111 int; q100 int; q113 int; q102 int; t111 int;
  before_sora_total int; after_sora_total int;
  before_tw_total int; after_tw_total int;
  before_sora_coins int; after_sora_coins int;
  before_tw_coins int; after_tw_coins int;
  before_sora_catches int; after_sora_catches int;
  before_tw_catches int; after_tw_catches int;
  before_sora_earned int; after_sora_earned int;
  before_tw_earned int; after_tw_earned int;
  reason text := '20260919 Evolution Candy family mapping reconciliation';
begin
  if exists (select 1 from candy_ledger where idempotency like 'hist-candy-recon:20260919:%') then
    raise notice 'Reconciliation already applied — skipping.';
    return;
  end if;

  select coalesce(sum(qty),0) into before_sora_total from family_candy where user_id = sora;
  select coalesce(sum(qty),0) into before_tw_total from family_candy where user_id = twinkle;
  select coins into before_sora_coins from inventories where user_id = sora;
  select coins into before_tw_coins from inventories where user_id = twinkle;
  select count(*) into before_sora_catches from catches where user_id = sora;
  select count(*) into before_tw_catches from catches where user_id = twinkle;
  select coalesce(candy_earned,0) into before_sora_earned from trainer_stats where user_id = sora;
  select coalesce(candy_earned,0) into before_tw_earned from trainer_stats where user_id = twinkle;

  select coalesce(qty,0) into q111 from family_candy where user_id = sora and family_id = 111 for update;
  select coalesce(qty,0) into q100 from family_candy where user_id = sora and family_id = 100 for update;
  select coalesce(qty,0) into t111 from family_candy where user_id = twinkle and family_id = 111 for update;
  select coalesce(qty,0) into q113 from family_candy where user_id = sora and family_id = 113 for update;
  select coalesce(qty,0) into q102 from family_candy where user_id = sora and family_id = 102 for update;

  if q111 <> 15 then raise exception 'Sora family 111 expected 15, got %', q111; end if;
  if q100 <> 3 then raise exception 'Sora family 100 expected 3, got %', q100; end if;
  if t111 <> 6 then raise exception 'Twinkle family 111 expected 6, got %', t111; end if;
  if q113 <> 0 then raise exception 'Sora family 113 expected 0 before recon, got %', q113; end if;
  if q102 <> 0 then raise exception 'Sora family 102 expected 0 before recon, got %', q102; end if;

  insert into family_candy (user_id, family_id, qty) values (sora, 113, 0) on conflict do nothing;
  insert into family_candy (user_id, family_id, qty) values (sora, 102, 0) on conflict do nothing;
  insert into family_candy (user_id, family_id, qty) values (twinkle, 113, 0) on conflict do nothing;

  select qty into q113 from family_candy where user_id = sora and family_id = 113 for update;
  select qty into q102 from family_candy where user_id = sora and family_id = 102 for update;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (sora, 111, -15, 'HISTORICAL_CANDY_RECONCILIATION_DEBIT', reason,
          'hist-candy-recon:20260919:sora:111-to-113:debit', null, 15, 0);
  update family_candy set qty = 0 where user_id = sora and family_id = 111;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (sora, 113, 15, 'HISTORICAL_CANDY_RECONCILIATION_CREDIT', reason,
          'hist-candy-recon:20260919:sora:111-to-113:credit', null, q113, q113 + 15);
  update family_candy set qty = q113 + 15 where user_id = sora and family_id = 113;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (sora, 100, -3, 'HISTORICAL_CANDY_RECONCILIATION_DEBIT', reason,
          'hist-candy-recon:20260919:sora:100-to-102:debit', null, 3, 0);
  update family_candy set qty = 0 where user_id = sora and family_id = 100;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (sora, 102, 3, 'HISTORICAL_CANDY_RECONCILIATION_CREDIT', reason,
          'hist-candy-recon:20260919:sora:100-to-102:credit', null, q102, q102 + 3);
  update family_candy set qty = q102 + 3 where user_id = sora and family_id = 102;

  select qty into q113 from family_candy where user_id = twinkle and family_id = 113 for update;
  if q113 is null then q113 := 0; end if;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (twinkle, 111, -6, 'HISTORICAL_CANDY_RECONCILIATION_DEBIT', reason,
          'hist-candy-recon:20260919:twinkle:111-to-113:debit', null, 6, 0);
  update family_candy set qty = 0 where user_id = twinkle and family_id = 111;

  insert into candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (twinkle, 113, 6, 'HISTORICAL_CANDY_RECONCILIATION_CREDIT', reason,
          'hist-candy-recon:20260919:twinkle:111-to-113:credit', null, q113, q113 + 6);
  update family_candy set qty = q113 + 6 where user_id = twinkle and family_id = 113;

  delete from family_candy where user_id in (sora, twinkle) and qty <= 0;

  if exists (select 1 from family_candy where user_id in (sora, twinkle) and qty < 0) then
    raise exception 'Negative balance detected';
  end if;

  select coalesce(sum(qty),0) into after_sora_total from family_candy where user_id = sora;
  select coalesce(sum(qty),0) into after_tw_total from family_candy where user_id = twinkle;
  if after_sora_total <> before_sora_total then
    raise exception 'Sora total candy not conserved: before % after %', before_sora_total, after_sora_total;
  end if;
  if after_tw_total <> before_tw_total then
    raise exception 'Twinkle total candy not conserved: before % after %', before_tw_total, after_tw_total;
  end if;

  if coalesce((select qty from family_candy where user_id=sora and family_id=113),0) <> 15 then
    raise exception 'Sora 113 expected 15';
  end if;
  if coalesce((select qty from family_candy where user_id=sora and family_id=102),0) <> 3 then
    raise exception 'Sora 102 expected 3';
  end if;
  if coalesce((select qty from family_candy where user_id=twinkle and family_id=113),0) <> 6 then
    raise exception 'Twinkle 113 expected 6';
  end if;

  select coins into after_sora_coins from inventories where user_id = sora;
  select coins into after_tw_coins from inventories where user_id = twinkle;
  select count(*) into after_sora_catches from catches where user_id = sora;
  select count(*) into after_tw_catches from catches where user_id = twinkle;
  select coalesce(candy_earned,0) into after_sora_earned from trainer_stats where user_id = sora;
  select coalesce(candy_earned,0) into after_tw_earned from trainer_stats where user_id = twinkle;

  if after_sora_coins is distinct from before_sora_coins then raise exception 'Sora coins changed'; end if;
  if after_tw_coins is distinct from before_tw_coins then raise exception 'Twinkle coins changed'; end if;
  if after_sora_catches <> before_sora_catches then raise exception 'Sora catches changed'; end if;
  if after_tw_catches <> before_tw_catches then raise exception 'Twinkle catches changed'; end if;
  if after_sora_earned <> before_sora_earned then raise exception 'Sora candy_earned changed'; end if;
  if after_tw_earned <> before_tw_earned then raise exception 'Twinkle candy_earned changed'; end if;
end;
$recon$;
