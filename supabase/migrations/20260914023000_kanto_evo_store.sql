-- Evolution item blurbs and initial balance_version=1 prices.
-- Does not reset a later admin price unless it is still the old 600/900 seed.

update private.store_items
   set blurb = 'A peculiar stone that can trigger certain Fire-type evolutions.',
       visible = true,
       cost = case when cost in (600, 900) then 350 else cost end
 where sku = 'firestone1';

update private.store_items
   set blurb = 'A peculiar stone that can trigger certain Water-type evolutions.',
       visible = true,
       cost = case when cost in (600, 900) then 350 else cost end
 where sku = 'waterstone1';

update private.store_items
   set blurb = 'A peculiar stone that can trigger certain Electric-type evolutions.',
       visible = true,
       cost = case when cost in (600, 900) then 350 else cost end
 where sku = 'thunderstone1';

update private.store_items
   set blurb = 'A peculiar stone that can trigger certain plant-related evolutions.',
       visible = true,
       cost = case when cost in (600, 900) then 350 else cost end
 where sku = 'leafstone1';

update private.store_items
   set blurb = 'A mysterious stone associated with certain unusual evolutions.',
       visible = true,
       cost = case when cost in (600, 900) then 450 else cost end
 where sku = 'moonstone1';

update private.store_items
   set blurb = 'A mysterious cord that can trigger certain evolutions normally caused by trading.',
       visible = true,
       featured = false,
       cost = case when cost in (600, 900) then 600 else cost end
 where sku = 'linkingcord1';
