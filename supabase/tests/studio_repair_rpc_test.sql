begin;
select plan(10);

-- All UUIDs, people, identifiers, and sanitary values below are synthetic.
-- The private seam is intentionally narrow: one rerunnable, revoked repair operation.
create function pg_temp.run_vod_ink_repair()
returns text
language plpgsql
as $$
declare
  receipt text;
begin
  if to_regprocedure('private.repair_vod_ink_studio()') is null then
    return 'missing_function';
  end if;
  execute 'select private.repair_vod_ink_studio()' into receipt;
  if to_regprocedure('private.backfill_consent_representation()') is not null then
    execute 'select private.backfill_consent_representation()';
  end if;
  return receipt;
end;
$$;

insert into public.studios (
  id, slug, legal_name, trade_name, tax_id, address, city, postal_code, phone,
  health_registration_number, health_authorization_date, health_data_verified_at
) values (
  '30000000-0000-4000-8000-000000000001', 'synthetic-unrelated',
  'SYNTHETIC UNRELATED LEGAL', 'SYNTHETIC UNRELATED TRADE', 'SYNTHETIC-TAX',
  'SYNTHETIC ADDRESS', 'SYNTHETIC CITY', '00000', 'SYNTHETIC PHONE',
  'SYNTHETIC-UNRELATED-REGISTRATION', date '2033-04-05',
  timestamptz '2033-04-06 07:08:09+00'
);
update public.studios
set legal_name = 'SYNTHETIC PRE-REPAIR LEGAL',
    trade_name = 'SYNTHETIC PRE-REPAIR TRADE',
    address = 'SYNTHETIC PRE-REPAIR ADDRESS',
    city = 'SYNTHETIC PRE-REPAIR CITY',
    postal_code = '00000',
    tax_id = 'SYNTHETIC-PRE-REPAIR-TAX',
    phone = 'SYNTHETIC PRE-REPAIR PHONE',
    health_registration_number = 'SAN/07/2024-C',
    health_authorization_date = date '2024-06-15',
    health_data_verified_at = null
where slug = 'vod-ink';

create temporary table repair_receipts (ordinal int, receipt text);
insert into repair_receipts values (1, pg_temp.run_vod_ink_repair());
create temporary table first_repair as
select legal_name, trade_name, address, city, postal_code, tax_id, phone,
  health_registration_number, health_authorization_date, health_data_verified_at
from public.studios where slug = 'vod-ink';
insert into repair_receipts values (2, pg_temp.run_vod_ink_repair());

select ok(
  coalesce((
    select count(*) = 2 and bool_and(
      not p.prosecdef
      and not has_function_privilege('anon', p.oid, 'execute')
      and not has_function_privilege('authenticated', p.oid, 'execute')
      and not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
    )
    from pg_proc p
    where p.oid in (
      to_regprocedure('private.repair_vod_ink_studio()'),
      to_regprocedure('private.backfill_consent_representation()')
    )
  ), false),
  'repair and backfill seams are revoked SECURITY INVOKER private functions'
);

select ok(
  (select row(legal_name, trade_name, address, city, postal_code, tax_id, phone)
     is not distinct from row(
       'vod ink', 'vod ink', 'calle la peña 107 bajo', 'Santander',
       '39011', '72203726X', '659937105'
     )
   from public.studios where slug = 'vod-ink')
  and (select row(
      s.legal_name, s.trade_name, s.address, s.city, s.postal_code, s.tax_id, s.phone,
      s.health_registration_number, s.health_authorization_date, s.health_data_verified_at
    ) is not distinct from row(
      f.legal_name, f.trade_name, f.address, f.city, f.postal_code, f.tax_id, f.phone,
      f.health_registration_number, f.health_authorization_date, f.health_data_verified_at
    )
    from public.studios s cross join first_repair f where s.slug = 'vod-ink')
  and (select row(legal_name, trade_name, tax_id, address, city, postal_code, phone)
     is not distinct from row(
       'SYNTHETIC UNRELATED LEGAL', 'SYNTHETIC UNRELATED TRADE', 'SYNTHETIC-TAX',
       'SYNTHETIC ADDRESS', 'SYNTHETIC CITY', '00000', 'SYNTHETIC PHONE'
     )
   from public.studios where slug = 'synthetic-unrelated'),
  'repeated repair persists exactly seven fields on only the unique target'
);

select ok(
  (select health_registration_number is null
      and health_authorization_date is null
      and health_data_verified_at is null
   from public.studios where slug = 'vod-ink')
  and (select array_agg(receipt order by ordinal)
       = array['sanitary_demo_pair_cleared', 'sanitary_empty']
       from repair_receipts),
  'the exact demo pair clears together, remains unverified, and is safely categorized'
);

select ok(
  (select row(
      health_registration_number, health_authorization_date, health_data_verified_at
    ) is not distinct from row(
      'SYNTHETIC-UNRELATED-REGISTRATION', date '2033-04-05',
      timestamptz '2033-04-06 07:08:09+00'
    )
   from public.studios where slug = 'synthetic-unrelated'),
  'repeated repair preserves unrelated-slug sanitary data and verification'
);

create temporary table sanitary_cases (
  case_name text, registration text, authorization_date date
);
insert into sanitary_cases values
  ('mixed', 'SAN/07/2024-C', date '2031-02-03'),
  ('one-member-missing', null, date '2024-06-15'),
  ('different', 'SYNTHETIC-REGISTRATION', date '2032-03-04');
create temporary table sanitary_results (
  case_name text, expected_registration text, expected_date date,
  actual_registration text, actual_date date, verified_at timestamptz, receipt text
);
do $$
declare
  c record;
begin
  for c in select * from sanitary_cases order by case_name loop
    update public.studios
    set health_registration_number = c.registration,
        health_authorization_date = c.authorization_date,
        health_data_verified_at = null
    where slug = 'vod-ink';
    insert into sanitary_results
    select c.case_name, c.registration, c.authorization_date,
      health_registration_number, health_authorization_date,
      health_data_verified_at, pg_temp.run_vod_ink_repair()
    from public.studios where slug = 'vod-ink';
  end loop;
end;
$$;
select ok(
  (select count(*) = 3 and bool_and(
      actual_registration is not distinct from expected_registration
      and actual_date is not distinct from expected_date
      and verified_at is null
      and receipt = 'sanitary_review_required'
    ) from sanitary_results),
  'mixed, missing-member, and different sanitary states are preserved for review'
);

create function pg_temp.unsafe_target_outcome(mode text)
returns text
language plpgsql
as $$
declare
  outcome text;
begin
  begin
    if mode = 'zero' then
      update public.studios set slug = 'synthetic-missing-target' where slug = 'vod-ink';
    elsif mode = 'duplicate' then
      execute 'alter table public.studios drop constraint studios_slug_key';
      insert into public.studios (slug, legal_name, trade_name)
      values ('vod-ink', 'SYNTHETIC DUPLICATE', 'SYNTHETIC DUPLICATE');
    end if;
    outcome := pg_temp.run_vod_ink_repair();
    raise exception using errcode = 'ZX001', message = 'rollback fixture';
  exception
    when sqlstate 'ZX001' then null;
    when others then outcome := sqlstate;
  end;
  return outcome;
end;
$$;
create temporary table unsafe_results as
select mode, pg_temp.unsafe_target_outcome(mode) outcome
from unnest(array['zero', 'duplicate']) as modes(mode);
select ok(
  (select count(*) = 2 and bool_and(outcome = 'P0001') from unsafe_results)
  and (select count(*) = 1 from public.studios where slug = 'vod-ink')
  and (select count(*) = 2 from public.studios),
  'zero or duplicate targets abort without fallback insert or unrelated mutation'
);

-- Build legacy states with the rollout checks temporarily absent; the outer rollback
-- restores both constraints after the test.
alter table public.consents
  drop constraint consents_representative_complete_or_null,
  drop constraint consents_minor_requires_legal_representative;
insert into public.artists (
  id, studio_id, full_name, dni, qualification, photo_url, drive_folder_id, status
) values (
  '30000000-0000-4000-8000-000000000002',
  '11111111-1111-4111-8111-111111111111',
  'SYNTHETIC DISPLAY ARTIST', 'SYNTHETIC-DNI', 'SYNTHETIC QUALIFICATION',
  null, 'SYNTHETIC-DRIVE-ID', 'active'
), (
  '30000000-0000-4000-8000-000000000003',
  '11111111-1111-4111-8111-111111111111',
  'SYNTHETIC PAUSED ARTIST', 'SYNTHETIC-PAUSED-DNI', 'SYNTHETIC PAUSED',
  null, 'SYNTHETIC-PAUSED-DRIVE', 'paused'
);
insert into public.consents (
  id, studio_id, artist_id, client_full_name, client_dni, idempotency_key,
  is_minor, representative_full_name, representative_dni,
  representative_birth_date, representative_phone, representative_address,
  representative_postal_code, representative_city,
  representative_relationship, representative_accreditation
)
select id, '11111111-1111-4111-8111-111111111111',
  '30000000-0000-4000-8000-000000000002', 'SYNTHETIC CLIENT',
  'SYNTHETIC-' || case_name, 'synthetic-' || case_name, is_minor,
  representative_full_name, representative_dni, representative_birth_date,
  representative_phone, representative_address, representative_postal_code,
  representative_city, representative_relationship, representative_accreditation
from (values
  ('30000000-0000-4000-8000-000000000011'::uuid, 'adult-null', false,
    null, null, null::date, null, null, null, null, null, null),
  ('30000000-0000-4000-8000-000000000012'::uuid, 'adult-complete', false,
    'SYNTHETIC REP', 'SYNTHETIC-REP-DNI', date '1980-01-02', 'SYNTHETIC PHONE',
    'SYNTHETIC ADDRESS', '00000', 'SYNTHETIC CITY', 'SYNTHETIC RELATION', 'SYNTHETIC PROOF'),
  ('30000000-0000-4000-8000-000000000013'::uuid, 'minor-complete', true,
    'SYNTHETIC REP', 'SYNTHETIC-REP-DNI', date '1980-01-02', 'SYNTHETIC PHONE',
    'SYNTHETIC ADDRESS', '00000', 'SYNTHETIC CITY', 'SYNTHETIC RELATION', 'SYNTHETIC PROOF'),
  ('30000000-0000-4000-8000-000000000014'::uuid, 'partial', false,
    'SYNTHETIC PARTIAL', null, null, null, null, null, null, null, null)
) fixtures(
  id, case_name, is_minor, representative_full_name, representative_dni,
  representative_birth_date, representative_phone, representative_address,
  representative_postal_code, representative_city,
  representative_relationship, representative_accreditation
);
create temporary table representative_before as
select id, jsonb_build_array(
  representative_full_name, representative_dni, representative_birth_date,
  representative_phone, representative_address, representative_postal_code,
  representative_city, representative_relationship, representative_accreditation
) fields
from public.consents where id::text like '30000000-0000-4000-8000-00000000001_';
select pg_temp.run_vod_ink_repair();
select ok(
  (select array_agg(has_legal_representative order by id)
     is not distinct from array[false, true, true, null]::boolean[]
   from public.consents where id::text like '30000000-0000-4000-8000-00000000001_'),
  'representation backfill changes only adult-null and complete consistent rows'
);
select ok(
  (select bool_and(b.fields is not distinct from jsonb_build_array(
      c.representative_full_name, c.representative_dni, c.representative_birth_date,
      c.representative_phone, c.representative_address, c.representative_postal_code,
      c.representative_city, c.representative_relationship, c.representative_accreditation
    )) from representative_before b join public.consents c using (id)),
  'representation backfill preserves every stored representative value'
);

select ok(
  (select array_agg(p.proargnames[a.position] order by a.position)
     filter (where p.proargmodes[a.position] in ('o', 't'))
     = array['id', 'full_name', 'qualification', 'photo_url']
   from pg_proc p
   cross join lateral generate_subscripts(p.proargnames, 1) a(position)
   where p.oid = to_regprocedure('public.get_active_artists(text)')),
  'compatibility RPC declares exactly four display-only output fields'
);
select ok(
  (select count(*) = 1 and bool_and(
      (select array_agg(key order by key)
       from jsonb_object_keys(to_jsonb(r)) as keys(key))
        = array['full_name', 'id', 'photo_url', 'qualification']
      and id = '30000000-0000-4000-8000-000000000002'
      and full_name = 'SYNTHETIC DISPLAY ARTIST'
      and qualification = 'SYNTHETIC QUALIFICATION'
      and photo_url is null
    ) from public.get_active_artists('vod-ink') r),
  'compatibility RPC returns only the active target artist display allowlist'
);

select * from finish();
rollback;
