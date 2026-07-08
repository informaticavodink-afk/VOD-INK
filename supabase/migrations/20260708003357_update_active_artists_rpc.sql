-- Update the public wizard RPC to return fields the consent PDF and upload flow need.
-- DNI and drive_folder_id are printed on the legal consent document and used for backup.

drop function if exists public.get_active_artists(text);

create or replace function public.get_active_artists(studio_slug text)
returns table (
  id uuid,
  studio_id uuid,
  full_name text,
  qualification text,
  dni text,
  photo_url text,
  drive_folder_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.studio_id,
    a.full_name,
    a.qualification,
    a.dni,
    a.photo_url,
    a.drive_folder_id
  from public.artists a
  join public.studios s on s.id = a.studio_id
  where s.slug = studio_slug
    and a.status = 'active'
  order by a.full_name;
$$;

revoke all on function public.get_active_artists(text) from public;
grant execute on function public.get_active_artists(text) to anon, authenticated;
