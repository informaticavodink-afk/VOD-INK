-- Document integrity slice: separated signatures and PDF integrity metadata.

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
