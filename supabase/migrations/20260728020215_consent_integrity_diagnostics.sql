-- Additive integrity controls for consent finalization and representation rollout.
alter table public.studios
  add column health_data_verified_at timestamptz;
alter table public.consents
  add column has_legal_representative boolean,
  add column finalization_content_sha256 text;
alter table public.consent_files
  add column drive_copy_claimed_at timestamptz,
  add column drive_copy_completed_at timestamptz;

alter table public.artists
  add constraint artists_id_studio_id_key unique (id, studio_id);
alter table public.consents
  add constraint consents_artist_studio_fkey
  foreign key (artist_id, studio_id) references public.artists (id, studio_id)
  on update restrict on delete restrict not valid;
create index consents_artist_id_studio_id_idx
  on public.consents (artist_id, studio_id);

alter table public.consents
  add constraint consents_representative_complete_or_null check (
    num_nonnulls(
      representative_full_name, representative_dni, representative_birth_date,
      representative_phone, representative_address, representative_postal_code,
      representative_city, representative_relationship, representative_accreditation
    ) = case
      when has_legal_representative is true then 9
      else 0
    end
  ) not valid,
  add constraint consents_minor_requires_legal_representative
  check (not is_minor or has_legal_representative is true) not valid;

alter table public.studios
  add constraint studios_health_data_verified_check check (
    health_data_verified_at is null or (
      nullif(btrim(health_registration_number), '') is not null
      and health_authorization_date is not null
      and not (
        health_registration_number = 'SAN/07/2024-C'
        and health_authorization_date = date '2024-06-15'
      )
    )
  ) not valid;

create or replace function private.clear_studio_health_verification()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.health_registration_number is distinct from old.health_registration_number
     or new.health_authorization_date is distinct from old.health_authorization_date then
    if new.health_data_verified_at is not distinct from old.health_data_verified_at then
      new.health_data_verified_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger studios_clear_health_verification
before update of health_registration_number, health_authorization_date, health_data_verified_at
on public.studios for each row
execute function private.clear_studio_health_verification();
revoke all on function private.clear_studio_health_verification()
  from public, anon, authenticated;

create or replace function private.consent_integrity_diagnostics(p_slug text)
returns table (category text, finding_count bigint, entity_ids uuid[])
language sql stable security invoker set search_path = '' as $$
  with target_studios as (
    select id from public.studios where slug = p_slug
  ),
  scoped_consents as (
    select c.*, num_nonnulls(
      c.representative_full_name, c.representative_dni, c.representative_birth_date,
      c.representative_phone, c.representative_address, c.representative_postal_code,
      c.representative_city, c.representative_relationship, c.representative_accreditation
    ) as representative_count
    from public.consents c
    where c.studio_id in (select id from target_studios)
  ),
  findings(category, entity_id) as (
    select 'target_studio', id from target_studios
    union all
    select 'sanitary_demo_pair', id from public.studios
    where id in (select id from target_studios)
      and health_registration_number = 'SAN/07/2024-C'
      and health_authorization_date = date '2024-06-15'
    union all
    select 'artist_studio_mismatch', c.id
    from public.consents c join public.artists a on a.id = c.artist_id
    where c.studio_id <> a.studio_id
      and (c.studio_id in (select id from target_studios)
        or a.studio_id in (select id from target_studios))
    union all
    select 'partial_representative', id from scoped_consents
    where representative_count between 1 and 8
    union all
    select 'minor_without_complete_representative', id from scoped_consents
    where is_minor and representative_count <> 9
    union all
    select 'adult_with_complete_representative', id from scoped_consents
    where not is_minor and representative_count = 9
  ),
  categories(category) as (values
    ('target_studio'), ('sanitary_demo_pair'), ('artist_studio_mismatch'),
    ('partial_representative'), ('minor_without_complete_representative'),
    ('adult_with_complete_representative')
  )
  select categories.category, count(findings.entity_id),
    coalesce(
      array_agg(findings.entity_id order by findings.entity_id)
        filter (where findings.entity_id is not null),
      '{}'::uuid[]
    )
  from categories left join findings using (category)
  group by categories.category;
$$;
revoke all on function private.consent_integrity_diagnostics(text)
  from public, anon, authenticated;

-- Keep existing owner updates while withholding attestation from Data API roles.
revoke update on public.studios from authenticated;
grant update (
  id, slug, legal_name, trade_name, tax_id, address, city, postal_code, phone,
  health_registration_number, health_authorization_date, created_at, updated_at
) on public.studios to authenticated;
