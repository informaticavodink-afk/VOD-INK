-- VOD INK Complete Consolidated Schema
-- This script initializes the full Supabase database schema in the correct order.
-- Safe to run directly in the Supabase SQL Editor.

-- WARNING: This will drop all existing VOD INK tables and custom types to start fresh.
drop table if exists public.audit_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.consent_files cascade;
drop table if exists public.consents cascade;
drop table if exists public.artists cascade;
drop table if exists public.profiles cascade;
drop table if exists public.studios cascade;
drop type if exists public.profile_role cascade;
drop type if exists public.artist_status cascade;
drop type if exists public.consent_status cascade;
drop type if exists public.notification_status cascade;
drop type if exists public.notification_type cascade;

create extension if not exists pgcrypto;
create schema if not exists private;

-- 1. Enums and Custom Types
create type public.profile_role as enum ('owner', 'admin', 'artist');
create type public.artist_status as enum ('active', 'paused');
create type public.consent_status as enum ('draft', 'pending_technique', 'pending_artist', 'signed', 'upload_error', 'cancelled');
create type public.notification_status as enum ('unread', 'read', 'resolved');
create type public.notification_type as enum ('pending_signature', 'pdf_upload_error', 'consent_signed', 'incomplete_data');

-- 2. Triggers Helper Function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Base Tables
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legal_name text not null,
  trade_name text not null,
  tax_id text,
  address text,
  city text,
  postal_code text,
  phone text,
  health_registration_number text,
  health_authorization_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studios_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  role public.profile_role not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_one_owner_or_artist check (role in ('owner', 'artist'))
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  dni text not null,
  qualification text not null,
  photo_url text,
  drive_folder_id text,
  status public.artist_status not null default 'active',
  login_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_login_email_unique_idx
  on public.artists (lower(login_email))
  where login_email is not null;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete restrict,
  artist_id uuid not null references public.artists(id) on delete restrict,
  client_full_name text not null,
  client_dni text not null,
  client_birth_date date,
  client_phone text,
  client_address text,
  client_postal_code text,
  client_city text,
  is_minor boolean not null default false,
  representative_full_name text,
  representative_dni text,
  representative_birth_date date,
  representative_phone text,
  representative_address text,
  representative_postal_code text,
  representative_city text,
  representative_relationship text,
  representative_accreditation text,
  health_flags jsonb not null default '[]'::jsonb,
  technique_data jsonb not null default '{}'::jsonb,
  legal_acceptance jsonb not null default '{}'::jsonb,
  signed_at timestamptz,
  status public.consent_status not null default 'draft',
  idempotency_key text not null,
  client_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consents_unique_idempotency_per_studio unique (studio_id, idempotency_key),
  constraint consents_minor_representative_required check (
    is_minor = false or (representative_full_name is not null and representative_dni is not null)
  )
);

create table public.consent_files (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references public.consents(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete restrict,
  bucket_id text not null default 'consent-pdfs',
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint,
  sha256 text,
  drive_file_id text,
  drive_view_link text,
  created_at timestamptz not null default now(),
  constraint consent_files_unique_storage_path unique (bucket_id, storage_path),
  constraint consent_files_pdf_mime check (mime_type = 'application/pdf')
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  consent_id uuid references public.consents(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  status public.notification_status not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz,
  constraint notifications_recipient_required check (artist_id is not null or recipient_profile_id is not null)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  artist_id uuid references public.artists(id) on delete set null,
  consent_id uuid references public.consents(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Triggers
create trigger studios_set_updated_at
before update on public.studios
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger artists_set_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

create trigger consents_set_updated_at
before update on public.consents
for each row execute function public.set_updated_at();

-- 5. Indexes
create index profiles_studio_id_role_idx on public.profiles (studio_id, role);
create index profiles_user_id_studio_id_idx on public.profiles (user_id, studio_id);

create index artists_studio_id_status_idx on public.artists (studio_id, status);
create index artists_profile_id_idx on public.artists (profile_id);

create index consents_studio_id_created_at_idx on public.consents (studio_id, created_at desc);
create index consents_artist_id_created_at_idx on public.consents (artist_id, created_at desc);
create index consents_status_created_at_idx on public.consents (status, created_at desc);
create index consents_client_dni_idx on public.consents (client_dni);

create index consent_files_consent_id_idx on public.consent_files (consent_id);
create index consent_files_studio_id_idx on public.consent_files (studio_id);
create index consent_files_artist_id_idx on public.consent_files (artist_id);

create index notifications_recipient_status_created_at_idx
  on public.notifications (recipient_profile_id, status, created_at desc);
create index notifications_artist_status_created_at_idx
  on public.notifications (artist_id, status, created_at desc);
create index notifications_studio_status_created_at_idx
  on public.notifications (studio_id, status, created_at desc);

create index audit_logs_studio_id_created_at_idx on public.audit_logs (studio_id, created_at desc);
create index audit_logs_consent_id_created_at_idx on public.audit_logs (consent_id, created_at desc);

-- 6. Helper Functions (Private)
create or replace function private.safe_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function private.is_studio_owner(target_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.studio_id = target_studio_id
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function private.is_studio_member(target_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.studio_id = target_studio_id
  );
$$;

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_artist_profile(target_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artists a
    join public.profiles p on p.id = a.profile_id
    where a.id = target_artist_id
      and p.user_id = (select auth.uid())
      and p.role = 'artist'
  );
$$;

create or replace function private.can_access_artist(target_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artists a
    where a.id = target_artist_id
      and (
        private.is_studio_owner(a.studio_id)
        or private.is_artist_profile(a.id)
      )
  );
$$;

-- 7. Public Functions
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

-- 8. Grants and Permissions
grant usage on schema private to authenticated;
grant execute on function private.safe_uuid(text) to authenticated;
grant execute on function private.is_studio_owner(uuid) to authenticated;
grant execute on function private.is_studio_member(uuid) to authenticated;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.is_artist_profile(uuid) to authenticated;
grant execute on function private.can_access_artist(uuid) to authenticated;

revoke all on function public.get_active_artists(text) from public;
grant execute on function public.get_active_artists(text) to anon, authenticated;

-- 9. Row Level Security (RLS)
alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.consents enable row level security;
alter table public.consent_files enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "studios members can read their studio"
on public.studios for select
to authenticated
using ((select private.is_studio_member(id)));

create policy "studios owners can update their studio"
on public.studios for update
to authenticated
using ((select private.is_studio_owner(id)))
with check ((select private.is_studio_owner(id)));

create policy "profiles users and owners can read studio profiles"
on public.profiles for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_studio_owner(studio_id))
);

create policy "artists owners can manage studio artists"
on public.artists for all
to authenticated
using ((select private.is_studio_owner(studio_id)))
with check ((select private.is_studio_owner(studio_id)));

create policy "artists can read own profile"
on public.artists for select
to authenticated
using ((select private.is_artist_profile(id)));

create policy "consents owners can manage studio consents"
on public.consents for all
to authenticated
using ((select private.is_studio_owner(studio_id)))
with check ((select private.is_studio_owner(studio_id)));

create policy "consents artists can read own consents"
on public.consents for select
to authenticated
using ((select private.is_artist_profile(artist_id)));

create policy "consent files owners can manage studio files"
on public.consent_files for all
to authenticated
using ((select private.is_studio_owner(studio_id)))
with check ((select private.is_studio_owner(studio_id)));

create policy "consent files artists can read own files"
on public.consent_files for select
to authenticated
using ((select private.is_artist_profile(artist_id)));

create policy "notifications owners can manage studio notifications"
on public.notifications for all
to authenticated
using ((select private.is_studio_owner(studio_id)))
with check ((select private.is_studio_owner(studio_id)));

create policy "notifications recipients can read own notifications"
on public.notifications for select
to authenticated
using (
  recipient_profile_id = (select private.current_profile_id())
  or (artist_id is not null and (select private.is_artist_profile(artist_id)))
);

create policy "notifications recipients can update own notification state"
on public.notifications for update
to authenticated
using (
  recipient_profile_id = (select private.current_profile_id())
  or (artist_id is not null and (select private.is_artist_profile(artist_id)))
)
with check (
  recipient_profile_id = (select private.current_profile_id())
  or (artist_id is not null and (select private.is_artist_profile(artist_id)))
);

create policy "audit logs owners can read studio audit logs"
on public.audit_logs for select
to authenticated
using ((select private.is_studio_owner(studio_id)));

create policy "audit logs artists can read own consent audit logs"
on public.audit_logs for select
to authenticated
using (artist_id is not null and (select private.is_artist_profile(artist_id)));

create policy "audit logs members can insert scoped audit logs"
on public.audit_logs for insert
to authenticated
with check ((select private.is_studio_member(studio_id)));

grant usage on schema public to anon, authenticated;
grant select, update on public.studios to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.artists to authenticated;
grant select, insert, update, delete on public.consents to authenticated;
grant select, insert, update, delete on public.consent_files to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert on public.audit_logs to authenticated;

-- 10. Private Storage bucket for signed consent PDFs
-- Drop existing storage policies first so the script can be re-run.
drop policy if exists "consent pdf owners can read studio files" on storage.objects;
drop policy if exists "consent pdf artists can read own files" on storage.objects;
drop policy if exists "consent pdf owners can upload studio files" on storage.objects;
drop policy if exists "consent pdf owners can update studio files" on storage.objects;
drop policy if exists "consent pdf owners can delete studio files" on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consent-pdfs', 'consent-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "consent pdf owners can read studio files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (select private.is_studio_owner(private.safe_uuid((storage.foldername(name))[2])))
);

create policy "consent pdf artists can read own files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (storage.foldername(name))[3] = 'artists'
  and (select private.is_artist_profile(private.safe_uuid((storage.foldername(name))[4])))
);

create policy "consent pdf owners can upload studio files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (select private.is_studio_owner(private.safe_uuid((storage.foldername(name))[2])))
);

create policy "consent pdf owners can update studio files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (select private.is_studio_owner(private.safe_uuid((storage.foldername(name))[2])))
)
with check (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (select private.is_studio_owner(private.safe_uuid((storage.foldername(name))[2])))
);

create policy "consent pdf owners can delete studio files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'consent-pdfs'
  and (storage.foldername(name))[1] = 'studios'
  and (select private.is_studio_owner(private.safe_uuid((storage.foldername(name))[2])))
);

-- 13. Document integrity signatures
create table if not exists public.consent_signatures (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references public.consents(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  signer_type text not null check (signer_type in ('client', 'representative', 'artist')),
  signer_name text not null,
  signature_storage_path text,
  signature_hash text not null,
  signed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (consent_id, signer_type)
);

create index if not exists consent_signatures_consent_id_idx
  on public.consent_signatures (consent_id);

create index if not exists consent_signatures_studio_id_idx
  on public.consent_signatures (studio_id);

create index if not exists consent_signatures_artist_id_idx
  on public.consent_signatures (artist_id);

alter table public.consent_signatures enable row level security;

create policy "consent signatures owners can manage studio signatures"
  on public.consent_signatures for all
  to authenticated
  using ((select private.is_studio_owner(studio_id)))
  with check ((select private.is_studio_owner(studio_id)));

create policy "consent signatures artists can read own signatures"
  on public.consent_signatures for select
  to authenticated
  using (artist_id is not null and (select private.is_artist_profile(artist_id)));

grant select, insert, update, delete on public.consent_signatures to authenticated;

-- 21. Multi-tenant foundation seeds (re-use existing studios seed)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'consents'
  ) then
    alter publication supabase_realtime add table public.consents;
  end if;
end $$;

-- 12. Seeds
insert into public.studios (
  id,
  slug,
  legal_name,
  trade_name,
  tax_id,
  address,
  city,
  postal_code,
  phone,
  health_registration_number,
  health_authorization_date
)
values (
  '11111111-1111-4111-8111-111111111111',
  'vod-ink',
  'VOD INK STUDIO S.L.',
  'VOD INK',
  'B39123456',
  'Calle Vargas 45, Bajo',
  'Santander',
  '39010',
  '942 05 44 22',
  'SAN/07/2024-C',
  '2024-06-15'
)
on conflict (id) do nothing;

-- No artists seeded as requested by the user

