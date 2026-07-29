-- Keep legacy clients compatible while reducing the public artist projection.
drop function public.get_active_artists(text);

create function public.get_active_artists(studio_slug text)
returns table (
  id uuid,
  full_name text,
  qualification text,
  photo_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.full_name,
    a.qualification,
    a.photo_url
  from public.artists as a
  inner join public.studios as s on s.id = a.studio_id
  where s.slug = studio_slug
    and a.status = 'active'
  order by a.full_name;
$$;

revoke all on function public.get_active_artists(text) from public;
grant execute on function public.get_active_artists(text) to anon, authenticated;
