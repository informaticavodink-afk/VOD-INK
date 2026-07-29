begin;
select plan(8);

-- All people, UUIDs, identifiers, and sanitary values below are synthetic.
select ok(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on c.oid = a.attrelid
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'consents'
     and a.attname = 'has_legal_representative')
  and not exists (
    select 1 from public.consents
    where has_legal_representative is null
  ),
  'all persisted consents have a non-null representation state'
);
select ok(
  coalesce((select convalidated from pg_constraint
    where conname = 'consents_representative_complete_or_null'), false),
  'complete-or-null representation constraint is validated'
);
select ok(
  coalesce((select convalidated from pg_constraint
    where conname = 'consents_minor_requires_legal_representative'), false),
  'minor representation constraint is validated'
);
select ok(
  coalesce((select convalidated from pg_constraint
    where conname = 'consents_artist_studio_fkey'), false),
  'artist/studio composite foreign key is validated'
);
-- Before validation, create only synthetic legacy conflicts inside this rollback.
-- Once the column is NOT NULL, the same helper intentionally creates no rows.
create function pg_temp.seed_validation_conflicts()
returns void language plpgsql as $$
begin
  if (select a.attnotnull
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'consents'
        and a.attname = 'has_legal_representative') then
    return;
  end if;

  alter table public.consents
    drop constraint if exists consents_representative_complete_or_null,
    drop constraint if exists consents_minor_requires_legal_representative,
    drop constraint if exists consents_artist_studio_fkey;
  insert into public.studios (id, slug, legal_name, trade_name)
  values ('40000000-0000-4000-8000-000000000001', 'synthetic-validation',
    'SYNTHETIC VALIDATION STUDIO', 'SYNTHETIC VALIDATION STUDIO')
  on conflict (id) do nothing;
  insert into public.artists (id, studio_id, full_name, dni, qualification)
  values
    ('40000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001', 'SYNTHETIC OTHER ARTIST',
      'SYNTHETIC-OTHER-DNI', 'SYNTHETIC QUALIFICATION'),
    ('40000000-0000-4000-8000-000000000008',
      '11111111-1111-4111-8111-111111111111', 'SYNTHETIC TARGET ARTIST',
      'SYNTHETIC-TARGET-DNI', 'SYNTHETIC QUALIFICATION')
  on conflict (id) do nothing;
  insert into public.consents (
    id, studio_id, artist_id, client_full_name, client_dni, idempotency_key,
    is_minor, has_legal_representative,
    representative_full_name, representative_dni, representative_birth_date,
    representative_phone, representative_address, representative_postal_code,
    representative_city, representative_relationship, representative_accreditation
  ) values
    ('40000000-0000-4000-8000-000000000003',
      '11111111-1111-4111-8111-111111111111',
      '40000000-0000-4000-8000-000000000002', 'SYNTHETIC MISMATCH CLIENT',
      'SYNTHETIC-MISMATCH-DNI', 'synthetic-validation-mismatch', false, false,
      null, null, null, null, null, null, null, null, null),
    ('40000000-0000-4000-8000-000000000004',
      '11111111-1111-4111-8111-111111111111',
      '40000000-0000-4000-8000-000000000008', 'SYNTHETIC NULL CLIENT',
      'SYNTHETIC-NULL-DNI', 'synthetic-validation-null', false, null,
      null, null, null, null, null, null, null, null, null),
    ('40000000-0000-4000-8000-000000000005',
      '11111111-1111-4111-8111-111111111111',
      '40000000-0000-4000-8000-000000000008', 'SYNTHETIC PARTIAL CLIENT',
      'SYNTHETIC-PARTIAL-DNI', 'synthetic-validation-partial', false, true,
      'SYNTHETIC REPRESENTATIVE', null, null, null, null, null, null, null, null),
    ('40000000-0000-4000-8000-000000000006',
      '11111111-1111-4111-8111-111111111111',
      '40000000-0000-4000-8000-000000000008', 'SYNTHETIC CONFLICT CLIENT',
      'SYNTHETIC-CONFLICT-DNI', 'synthetic-validation-conflict', false, false,
      'SYNTHETIC REPRESENTATIVE', 'SYNTHETIC-REP-DNI', date '1980-01-02',
      'SYNTHETIC PHONE', 'SYNTHETIC ADDRESS', '00000', 'SYNTHETIC CITY',
      'SYNTHETIC RELATION', 'SYNTHETIC ACCREDITATION'),
    ('40000000-0000-4000-8000-000000000007',
      '11111111-1111-4111-8111-111111111111',
      '40000000-0000-4000-8000-000000000008', 'SYNTHETIC MINOR CLIENT',
      'SYNTHETIC-MINOR-DNI', 'synthetic-validation-minor', true, null,
      'SYNTHETIC REPRESENTATIVE', 'SYNTHETIC-REP-DNI', null, null, null, null,
      null, null, null);
end;
$$;
select pg_temp.seed_validation_conflicts();

select is(
  (select count(*) from public.consents where has_legal_representative is null),
  case when (select a.attnotnull from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'consents'
      and a.attname = 'has_legal_representative') then 0 else 2 end::bigint,
  'readiness reports nullable representation states without exposing values'
);
select ok(
  case when (select a.attnotnull from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'consents'
      and a.attname = 'has_legal_representative') then
    coalesce((select sum(finding_count)
      from private.consent_integrity_diagnostics('vod-ink')
      where category in ('artist_studio_mismatch', 'partial_representative',
        'minor_without_complete_representative', 'adult_with_complete_representative')), 0) = 0
  else
    (select count(*) = 4 and sum(finding_count) = 5 and bool_and(
      category in ('artist_studio_mismatch', 'partial_representative',
        'minor_without_complete_representative', 'adult_with_complete_representative')
      and pg_typeof(finding_count) = 'bigint'::regtype
      and pg_typeof(entity_ids) = 'uuid[]'::regtype
    ) from private.consent_integrity_diagnostics('vod-ink')
    where category in ('artist_studio_mismatch', 'partial_representative',
      'minor_without_complete_representative', 'adult_with_complete_representative'))
  end,
  'readiness surfaces only aggregate categories and opaque synthetic UUIDs'
);
select ok(
  (select count(*) = 6 and bool_and(
    category in ('target_studio', 'sanitary_demo_pair', 'artist_studio_mismatch',
      'partial_representative', 'minor_without_complete_representative',
      'adult_with_complete_representative')
    and pg_typeof(category) = 'text'::regtype
    and pg_typeof(finding_count) = 'bigint'::regtype
    and pg_typeof(entity_ids) = 'uuid[]'::regtype
  ) from private.consent_integrity_diagnostics('vod-ink')),
  'diagnostics keep a fixed category/count/opaque-UUID projection'
);
select ok(
  (select coalesce(bool_and(finding_count >= 0
    and cardinality(entity_ids) = finding_count), true)
   from private.consent_integrity_diagnostics('vod-ink')),
  'diagnostics expose counts and UUID arrays without person or sanitary values'
);

select * from finish();
rollback;
