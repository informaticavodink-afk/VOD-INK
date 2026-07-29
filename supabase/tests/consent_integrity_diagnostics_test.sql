begin;
select plan(33);

-- All UUIDs and person/identifier values in this file are synthetic.
select has_column('public', 'studios', 'health_data_verified_at',
  'studios records sanitary-data attestation time');
select has_column('public', 'consents', 'has_legal_representative',
  'representation is independent from minority');
select has_column('public', 'consents', 'finalization_content_sha256',
  'consents can claim deterministic finalization content');
select has_column('public', 'consent_files', 'drive_copy_claimed_at',
  'final files can claim Drive reconciliation');
select has_column('public', 'consent_files', 'drive_copy_completed_at',
  'final files record completed Drive reconciliation');

select has_function(
  'private',
  'consent_integrity_diagnostics',
  array['text'],
  'privacy-safe integrity diagnostics are reusable'
);

-- Keep the expected missing function as an assertion failure, not a plan-aborting
-- parse error, so later RED assertions (including the mismatched write) still run.
create function pg_temp.consent_integrity_diagnostic_summary(p_slug text)
returns setof text
language plpgsql
as $$
begin
  if to_regprocedure('private.consent_integrity_diagnostics(text)') is null then
    return;
  end if;

  return query execute
    'select (category || '':'' || finding_count::text) collate "C"
       from private.consent_integrity_diagnostics($1)
      order by category'
    using p_slug;
end;
$$;

select ok(
  array(
    select summary collate "C"
    from pg_temp.consent_integrity_diagnostic_summary('vod-ink') as summary
  ) collate "C" = array[
    'adult_with_complete_representative:0',
    'artist_studio_mismatch:0',
    'minor_without_complete_representative:0',
    'partial_representative:0',
    'sanitary_demo_pair:1',
    'target_studio:1'
  ] collate "C",
  'diagnostics report only bounded categories and counts for the synthetic seed'
);

select ok(
  (
    select string_agg(p.proargnames[a.position], ',' order by a.position)
    from pg_proc p
    cross join lateral generate_subscripts(p.proargnames, 1) as a(position)
    where p.oid = to_regprocedure('private.consent_integrity_diagnostics(text)')
      and p.proargmodes[a.position] in ('o', 't')
  ) collate "C" = 'category,finding_count,entity_ids' collate "C",
  'diagnostics expose no names, DNI, phones, signatures, sanitary values, or PDF bytes'
);

insert into public.studios (id, slug, legal_name, trade_name)
values (
  '20000000-0000-4000-8000-000000000001',
  'synthetic-secondary',
  'SYNTHETIC STUDIO',
  'SYNTHETIC STUDIO'
);
insert into public.artists (
  id, studio_id, full_name, dni, qualification
) values (
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'SYNTHETIC ARTIST',
  'SYNTHETIC-ID',
  'SYNTHETIC QUALIFICATION'
);

select throws_ok(
  $$
    insert into public.consents (
      studio_id, artist_id, client_full_name, client_dni, idempotency_key
    ) values (
      '11111111-1111-4111-8111-111111111111',
      '20000000-0000-4000-8000-000000000002',
      'SYNTHETIC CLIENT',
      'SYNTHETIC-CLIENT-ID',
      'synthetic-mismatch'
    )
  $$,
  '23503',
  null,
  'a new consent cannot bind an artist from another studio'
);

-- Exercise the existing diagnostics output, not only its catalog signature.
select ok(
  (
    select count(*) = 6 and bool_and(
      category = any(array[
        'target_studio', 'sanitary_demo_pair', 'artist_studio_mismatch',
        'partial_representative', 'minor_without_complete_representative',
        'adult_with_complete_representative'
      ])
      and pg_typeof(category) = 'text'::regtype
      and pg_typeof(finding_count) = 'bigint'::regtype
      and pg_typeof(entity_ids) = 'uuid[]'::regtype
    )
    from private.consent_integrity_diagnostics('vod-ink')
  ),
  'diagnostic rows contain only fixed categories, counts, and opaque UUID arrays'
);

insert into public.consents (
  id, studio_id, artist_id, client_full_name, client_dni, idempotency_key
) values (
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  'SYNTHETIC UPDATE CLIENT',
  'SYNTHETIC-UPDATE-ID',
  'synthetic-update-match'
);
select throws_ok(
  $$
    update public.consents
    set studio_id = '11111111-1111-4111-8111-111111111111'
    where id = '20000000-0000-4000-8000-000000000003'
  $$,
  '23503',
  null,
  'an existing consent cannot be moved away from its artist studio'
);

create function pg_temp.representative_fields(p_omit text default null)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(field_name order by ordinal)
      filter (where field_name is distinct from p_omit),
    '{}'::text[]
  )
  from unnest(array[
    'representative_full_name', 'representative_dni',
    'representative_birth_date', 'representative_phone',
    'representative_address', 'representative_postal_code',
    'representative_city', 'representative_relationship',
    'representative_accreditation'
  ]::text[]) with ordinality as fields(field_name, ordinal);
$$;

create function pg_temp.representative_write_outcome(
  p_case text,
  p_flag boolean,
  p_is_minor boolean,
  p_fields text[]
)
returns text
language plpgsql
as $$
begin
  insert into public.consents (
    studio_id, artist_id, client_full_name, client_dni, idempotency_key,
    is_minor, has_legal_representative,
    representative_full_name, representative_dni, representative_birth_date,
    representative_phone, representative_address, representative_postal_code,
    representative_city, representative_relationship,
    representative_accreditation
  ) values (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'SYNTHETIC REPRESENTATION CLIENT',
    'SYNTHETIC-' || p_case,
    'synthetic-' || p_case,
    p_is_minor,
    p_flag,
    case when 'representative_full_name' = any(p_fields) then 'SYNTHETIC REPRESENTATIVE' end,
    case when 'representative_dni' = any(p_fields) then 'SYNTHETIC-REP-ID' end,
    case when 'representative_birth_date' = any(p_fields) then date '1980-01-02' end,
    case when 'representative_phone' = any(p_fields) then 'SYNTHETIC-PHONE' end,
    case when 'representative_address' = any(p_fields) then 'SYNTHETIC ADDRESS' end,
    case when 'representative_postal_code' = any(p_fields) then '00000' end,
    case when 'representative_city' = any(p_fields) then 'SYNTHETIC CITY' end,
    case when 'representative_relationship' = any(p_fields) then 'SYNTHETIC RELATION' end,
    case when 'representative_accreditation' = any(p_fields) then 'SYNTHETIC ACCREDITATION' end
  );
  return 'accepted';
exception when check_violation then
  return sqlstate;
end;
$$;

select is(
  pg_temp.representative_write_outcome(
    'represented-complete', true, false, pg_temp.representative_fields()
  ),
  'accepted',
  'a represented adult accepts all nine representative fields'
);

select is(
  pg_temp.representative_write_outcome(
    'represented-missing-' || field_name,
    true,
    false,
    pg_temp.representative_fields(field_name)
  ),
  '23514',
  'represented consent rejects missing ' || field_name
)
from unnest(pg_temp.representative_fields()) as omitted(field_name);

select is(
  pg_temp.representative_write_outcome(
    'unrepresented-null', false, false, '{}'::text[]
  ),
  'accepted',
  'an unrepresented adult accepts an all-null representative record'
);
select is(
  pg_temp.representative_write_outcome(
    'unrepresented-partial', false, false, array['representative_full_name']
  ),
  '23514',
  'an unrepresented adult rejects any representative value'
);
select is(
  pg_temp.representative_write_outcome(
    'rollout-null-empty', null, false, '{}'::text[]
  ),
  'accepted',
  'the nullable rollout state accepts only an empty representative record'
);
select is(
  pg_temp.representative_write_outcome(
    'rollout-null-partial', null, false, array['representative_full_name']
  ),
  '23514',
  'the nullable rollout state rejects a partial representative record'
);
select is(
  pg_temp.representative_write_outcome(
    'rollout-null-complete', null, false, pg_temp.representative_fields()
  ),
  '23514',
  'the nullable rollout state rejects an ambiguous complete representative record'
);
select is(
  pg_temp.representative_write_outcome(
    'minor-unrepresented', false, true, '{}'::text[]
  ),
  '23514',
  'a minor cannot disable legal representation'
);
select is(
  pg_temp.representative_write_outcome(
    'minor-rollout-null', null, true, '{}'::text[]
  ),
  '23514',
  'a minor cannot retain a null representation state'
);

select lives_ok(
  $$
    update public.studios
    set health_registration_number = 'SYNTHETIC-HEALTH-REGISTRATION',
        health_authorization_date = date '2030-01-02',
        health_data_verified_at = timestamptz '2030-01-03 00:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  'complete non-demo sanitary data can be explicitly attested'
);
update public.studios
set health_registration_number = 'SYNTHETIC-HEALTH-REGISTRATION-CHANGED'
where id = '20000000-0000-4000-8000-000000000001';
select is(
  (
    select health_data_verified_at
    from public.studios
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  null::timestamptz,
  'editing sanitary data without a fresh attestation clears verification'
);
select throws_ok(
  $$
    update public.studios
    set health_registration_number = ' ',
        health_data_verified_at = timestamptz '2030-01-04 00:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'blank sanitary registration cannot be attested'
);
select throws_ok(
  $$
    update public.studios
    set health_authorization_date = null,
        health_data_verified_at = timestamptz '2030-01-04 00:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'missing sanitary authorization date cannot be attested'
);
select throws_ok(
  $$
    update public.studios
    set health_registration_number = 'SAN/07/2024-C',
        health_authorization_date = date '2024-06-15',
        health_data_verified_at = timestamptz '2030-01-04 00:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'the exact demo sanitary pair cannot be attested'
);

select * from finish();
rollback;
