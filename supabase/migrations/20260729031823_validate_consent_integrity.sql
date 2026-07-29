-- Validate consent representation and studio/artist integrity after a zero-diagnostic review.
-- Complete represented adults are resolved by the conservative backfill; only
-- unresolved complete legacy records remain diagnostic findings.
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
    where is_minor and (representative_count <> 9 or has_legal_representative is not true)
    union all
    select 'adult_with_complete_representative', id from scoped_consents
    where not is_minor and representative_count = 9
      and has_legal_representative is distinct from true
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

do $$
declare
  target_count bigint;
  unresolved_count bigint;
begin
  select count(*) into target_count
  from (
    select id from public.studios where slug = 'vod-ink' for update
  ) target_studios;
  if target_count <> 1 then
    raise exception 'vod-ink studio target must be unique' using errcode = 'P0001';
  end if;

  select count(*) into unresolved_count
  from public.consents c
  where c.has_legal_representative is null
    or (c.has_legal_representative is true and num_nonnulls(
      c.representative_full_name, c.representative_dni, c.representative_birth_date,
      c.representative_phone, c.representative_address, c.representative_postal_code,
      c.representative_city, c.representative_relationship,
      c.representative_accreditation) <> 9)
    or (c.has_legal_representative is not true and num_nonnulls(
      c.representative_full_name, c.representative_dni, c.representative_birth_date,
      c.representative_phone, c.representative_address, c.representative_postal_code,
      c.representative_city, c.representative_relationship,
      c.representative_accreditation) <> 0)
    or (c.is_minor and c.has_legal_representative is not true);
  if unresolved_count <> 0 then
    raise exception 'consent representation diagnostics are unresolved' using errcode = 'P0001';
  end if;

  select coalesce(sum(finding_count), 0)::bigint into unresolved_count
  from private.consent_integrity_diagnostics('vod-ink')
  where category in (
    'artist_studio_mismatch', 'partial_representative',
    'minor_without_complete_representative', 'adult_with_complete_representative'
  );
  if unresolved_count <> 0 then
    raise exception 'consent integrity diagnostics are unresolved' using errcode = 'P0001';
  end if;
end;
$$;

alter table public.consents
  alter column has_legal_representative set not null;
alter table public.consents
  validate constraint consents_representative_complete_or_null;
alter table public.consents
  validate constraint consents_minor_requires_legal_representative;
alter table public.consents
  validate constraint consents_artist_studio_fkey;
alter table public.studios
  validate constraint studios_health_data_verified_check;
