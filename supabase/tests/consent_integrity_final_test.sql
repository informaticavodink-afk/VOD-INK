begin;
select plan(10);

-- All people, UUIDs, document values, and file metadata are synthetic.
select ok(
  to_regprocedure('public.get_active_artists(text)') is null,
  'legacy active-artists RPC is absent after endpoint cutover'
);
select ok(
  case when to_regprocedure('public.get_active_artists(text)') is null then true
  else not has_function_privilege('anon', 'public.get_active_artists(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.get_active_artists(text)', 'execute')
  end,
  'legacy active-artists RPC is not callable by API roles'
);
insert into public.studios (id, slug, legal_name, trade_name)
values ('50000000-0000-4000-8000-000000000001', 'synthetic-final-secondary',
  'SYNTHETIC SECONDARY STUDIO', 'SYNTHETIC SECONDARY STUDIO')
on conflict (id) do nothing;
insert into public.artists (id, studio_id, full_name, dni, qualification)
values
  ('50000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111', 'SYNTHETIC FINAL ARTIST',
    'SYNTHETIC-FINAL-DNI', 'SYNTHETIC QUALIFICATION'),
  ('50000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000001', 'SYNTHETIC OTHER FINAL ARTIST',
    'SYNTHETIC-OTHER-DNI', 'SYNTHETIC QUALIFICATION')
on conflict (id) do nothing;

create function pg_temp.write_invalid_consent(p_case text)
returns text language plpgsql as $$
begin
  insert into public.consents (
    id, studio_id, artist_id, client_full_name, client_dni, idempotency_key,
    is_minor, has_legal_representative, representative_full_name,
    representative_dni, representative_birth_date, representative_phone,
    representative_address, representative_postal_code, representative_city,
    representative_relationship, representative_accreditation
  ) values (
    case p_case when 'null' then '50000000-0000-4000-8000-000000000010'::uuid
      when 'partial' then '50000000-0000-4000-8000-000000000011'::uuid
      when 'minor' then '50000000-0000-4000-8000-000000000012'::uuid
      else '50000000-0000-4000-8000-000000000013'::uuid end,
    '11111111-1111-4111-8111-111111111111',
    case when p_case = 'mismatch' then
      '50000000-0000-4000-8000-000000000003'::uuid
      else '50000000-0000-4000-8000-000000000002'::uuid end,
    'SYNTHETIC INVALID CLIENT', 'SYNTHETIC-INVALID-DNI',
    'synthetic-final-' || p_case,
    p_case = 'minor',
    case p_case when 'null' then null when 'partial' then true
      when 'minor' then false else false end,
    case when p_case = 'partial' then 'SYNTHETIC REPRESENTATIVE' end,
    null, null, null, null, null, null, null, null
  );
  return 'accepted';
exception when others then
  return sqlstate;
end;
$$;
select is(pg_temp.write_invalid_consent('null'), '23502',
  'null representation state is rejected after validation');
select is(pg_temp.write_invalid_consent('partial'), '23514',
  'partial represented consent is rejected');
select is(pg_temp.write_invalid_consent('minor'), '23514',
  'minor without representation is rejected');
select is(pg_temp.write_invalid_consent('mismatch'), '23503',
  'cross-studio consent insert is rejected by the composite foreign key');

insert into public.consents (
  id, studio_id, artist_id, client_full_name, client_dni, idempotency_key,
  is_minor, has_legal_representative
) values (
  '50000000-0000-4000-8000-000000000014',
  '11111111-1111-4111-8111-111111111111',
  '50000000-0000-4000-8000-000000000002', 'SYNTHETIC UPDATE CLIENT',
  'SYNTHETIC-UPDATE-DNI', 'synthetic-final-update', false, false
);
select throws_ok(
  $$update public.consents
    set studio_id = '50000000-0000-4000-8000-000000000001'
    where id = '50000000-0000-4000-8000-000000000014'$$,
  '23503', null,
  'cross-studio consent update is rejected by the composite foreign key'
);

create temporary table final_document_before as
select to_jsonb(c) as consent_row, to_jsonb(f) as file_row
from public.consents c
join public.consent_files f on f.consent_id = c.id and f.document_kind = 'final'
where false;
insert into public.consents (
  id, studio_id, artist_id, client_full_name, client_dni, idempotency_key,
  is_minor, has_legal_representative, status
) values (
  '50000000-0000-0000-0000-000000000015',
  '11111111-1111-4111-8111-111111111111',
  '50000000-0000-4000-8000-000000000002', 'SYNTHETIC FINAL CLIENT',
  'SYNTHETIC-FINAL-CLIENT-DNI', 'synthetic-final-document', false, false,
  'pending_artist'
);
insert into public.consent_files (
  id, consent_id, studio_id, artist_id, storage_path, file_name,
  document_kind, sha256, size_bytes
) values (
  '50000000-0000-4000-8000-000000000016',
  '50000000-0000-0000-0000-000000000015',
  '11111111-1111-4111-8111-111111111111',
  '50000000-0000-4000-8000-000000000002',
  'studios/synthetic/final.pdf', 'synthetic-final.pdf', 'final',
  'synthetic-final-sha256', 16
);
update public.consents
set final_file_id = '50000000-0000-4000-8000-000000000016',
    status = 'signed', signed_at = timestamptz '2035-01-02 03:04:05+00',
    finalized_at = timestamptz '2035-01-02 03:04:05+00',
    finalization_started_at = timestamptz '2035-01-02 03:04:00+00',
    document_template_version = 'synthetic-final-v3',
    document_snapshot = '{"synthetic":true}'::jsonb
where id = '50000000-0000-0000-0000-000000000015';
insert into final_document_before
select to_jsonb(c), to_jsonb(f)
from public.consents c
join public.consent_files f on f.consent_id = c.id
where c.id = '50000000-0000-0000-0000-000000000015';
create temporary table repair_before as
select legal_name, trade_name, address, city, postal_code, tax_id, phone,
  health_registration_number, health_authorization_date, health_data_verified_at
from public.studios where slug = 'vod-ink';
select private.repair_vod_ink_studio();
select private.repair_vod_ink_studio();
select private.backfill_consent_representation();
select ok(
  (select row(to_jsonb(c), to_jsonb(f)) is not distinct from
      row(b.consent_row, b.file_row)
   from final_document_before b
   join public.consents c on c.id = '50000000-0000-0000-0000-000000000015'
   join public.consent_files f on f.id = '50000000-0000-4000-8000-000000000016'),
  'repair and backfill do not change finalized document rows or files'
);
select ok(
  (select row(s.legal_name, s.trade_name, s.address, s.city, s.postal_code, s.tax_id, s.phone,
      s.health_registration_number, s.health_authorization_date, s.health_data_verified_at)
      is not distinct from row(
        b.legal_name, b.trade_name, b.address, b.city, b.postal_code, b.tax_id,
        b.phone, b.health_registration_number, b.health_authorization_date,
        b.health_data_verified_at)
   from public.studios s cross join repair_before b where s.slug = 'vod-ink'),
  'target repair remains idempotent after repeated execution'
);
select ok(
  coalesce((select sum(finding_count)
    from private.consent_integrity_diagnostics('vod-ink')
    where category in ('artist_studio_mismatch', 'partial_representative',
      'minor_without_complete_representative', 'adult_with_complete_representative')), 0) = 0,
  'post-validation readiness diagnostics remain privacy-safe and clear'
);
select * from finish();
rollback;
