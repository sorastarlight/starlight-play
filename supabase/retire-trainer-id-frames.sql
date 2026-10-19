-- Applied via Supabase migration retire_trainer_id_frames; do not replay from GitHub.
UPDATE public.progression_cosmetics SET enabled=false, starter=false WHERE kind='frame' AND (enabled OR starter);
