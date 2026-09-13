-- PostgREST cannot choose between play_rankings() and play_rankings(text).
drop function if exists public.play_rankings();
grant execute on function public.play_rankings(text) to authenticated, anon;
