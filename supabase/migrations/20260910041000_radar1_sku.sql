-- Rename the Poké Radar shelf SKU from lure1 to radar1.

update private.store_items
  set sku = 'radar1'
  where sku = 'lure1'
    and not exists (select 1 from private.store_items where sku = 'radar1');
