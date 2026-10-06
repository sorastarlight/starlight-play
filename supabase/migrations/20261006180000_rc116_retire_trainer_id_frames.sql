-- rc116: retire the player-facing Trainer ID Frame feature.
-- Non-destructive: frame rows, owned trainer_cosmetics rows, and saved profiles.card_frame values are kept.
-- Disabled cosmetics are no longer granted, announced, or equippable (evaluate_cosmetics / unlock_cosmetic /
-- assert_cosmetic_owned all require enabled = true). frame-plain stays enabled as the neutral default.

update public.progression_cosmetics
   set enabled = false
 where kind = 'frame'
   and id <> 'frame-plain';

update public.progression_achievements
   set rewards = rewards - 'cosmetic'
 where id = 'dex-151'
   and rewards->>'cosmetic' like 'frame-%';
