-- The public artist endpoint is live; close the legacy database API surface.
revoke execute on function public.get_active_artists(text)
  from public, anon, authenticated;
drop function public.get_active_artists(text);
