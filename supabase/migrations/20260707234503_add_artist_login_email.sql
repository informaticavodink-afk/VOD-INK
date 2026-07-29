-- Store the login email assigned to each tattoo artist.
-- Passwords are never stored here; they live only in Supabase Auth.
do $$
begin
  if to_regclass('public.artists') is not null then
    alter table public.artists
      add column if not exists login_email text;

    create unique index if not exists artists_login_email_unique_idx
      on public.artists (lower(login_email))
      where login_email is not null;
  end if;
end
$$;
