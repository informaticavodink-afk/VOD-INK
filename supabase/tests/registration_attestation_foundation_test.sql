begin;
select plan(20);
-- All registration values and identifiers are synthetic except the documented legacy demo deny value.
create temporary table registration_vectors(name text, input text, valid boolean);
insert into registration_vectors values
 ('ascii trim', E'\t  RG À\u00a0/ 7 \r', true), ('empty', E' \t\n', false),
 ('one char', 'X', true), ('120 Unicode chars', repeat('😀', 120), true),
 ('121 chars', repeat('x', 121), false),
 ('legacy demo', 'SAN/07/2024-C', false), ('placeholder case', 'PoR DeTeRmInAr', false),
 ('matching square', '[pending value]', false), ('matching angle', '<anything>', false),
 ('matching brace', '{anything}', false), ('mismatched bracket', '[anything}', true),
 ('sentinel delimiter', 'FAKE/value', false), ('sentinel space', 'FAKE value', true),
 ('allowed substring', 'prefix-demo-suffix', true), ('punctuation', 'áccent.Mixed case / 42', true);
select ok(
  (select count(*) = 15 and bool_and(private.is_valid_registration_number(input) = valid)
   from registration_vectors),
  'SQL-authoritative validator satisfies the shared vectors');
select is(private.normalize_registration_number(E'\t\n  Reg À' || chr(160) || E'/ 7  \r'),
  'Reg À' || chr(160) || '/ 7', 'normalization trims only outer ASCII whitespace');
insert into public.studios (
 id, slug, legal_name, trade_name, health_registration_number,
 health_authorization_date, health_data_verified_at
) values (
 '61000000-0000-4000-8000-000000000001', 'synthetic-attestation-a1',
 'SYNTHETIC LEGAL', 'SYNTHETIC TRADE', 'RG-A/1', date '2030-01-02',
 timestamptz '2030-01-03 04:05:06+00');
insert into auth.users (id, email) values
 ('62000000-0000-4000-8000-000000000001', 'synthetic-a1@example.invalid');
insert into public.profiles (id, user_id, studio_id, role, full_name) values (
 '63000000-0000-4000-8000-000000000001',
 '62000000-0000-4000-8000-000000000001',
 '61000000-0000-4000-8000-000000000001', 'owner', 'SYNTHETIC OWNER');
update public.studios set health_registration_number = 'RG-B/2',
 health_data_verified_at = timestamptz '2031-01-01 00:00:00+00'
where id = '61000000-0000-4000-8000-000000000001';
select is((select health_data_verified_at from public.studios where id =
 '61000000-0000-4000-8000-000000000001'), null::timestamptz,
 'real registration change clears even a supplied attestation');
update public.studios set health_data_verified_at = timestamptz '2032-02-03 04:05:06+00'
where id = '61000000-0000-4000-8000-000000000001';
update public.studios set health_registration_number = E'\tRG-B/2 ',
 health_authorization_date = date '2040-04-05'
where id = '61000000-0000-4000-8000-000000000001';
select is((select health_data_verified_at from public.studios where id =
 '61000000-0000-4000-8000-000000000001'), timestamptz '2032-02-03 04:05:06+00',
 'normalized-equivalent registration and date-only change preserve attestation');
update public.studios set health_data_verified_at = null
where id = '61000000-0000-4000-8000-000000000001';
update public.studios set health_authorization_date = date '2041-05-06',
 health_data_verified_at = timestamptz '2041-05-07 00:00:00+00'
where id = '61000000-0000-4000-8000-000000000001';
select is((select health_data_verified_at from public.studios where id =
 '61000000-0000-4000-8000-000000000001'), null::timestamptz,
 'date-only change cannot establish attestation');
update public.studios set health_registration_number = 'demo', health_data_verified_at = null
where id = '61000000-0000-4000-8000-000000000001';
select throws_ok($$update public.studios set health_data_verified_at = now()
 where id = '61000000-0000-4000-8000-000000000001'$$,
 '23514', null, 'registration-only constraint rejects attesting an invalid number');
select lives_ok($$update public.studios set health_registration_number = 'RG-C/3',
 health_authorization_date = null where id = '61000000-0000-4000-8000-000000000001'$$,
 'nullable date remains independent of registration validity');
select ok(
  not exists (select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'studios'
      and grantee = 'PUBLIC' and privilege_type = 'UPDATE')
  and not has_table_privilege('anon', 'public.studios', 'update')
  and not has_table_privilege('authenticated', 'public.studios', 'update'),
  'table-wide studio update is absent from PUBLIC and API roles');
select ok(
  not has_column_privilege('authenticated', 'public.studios', 'health_registration_number', 'update')
  and not has_column_privilege('authenticated', 'public.studios', 'health_authorization_date', 'update')
  and not has_column_privilege('authenticated', 'public.studios', 'health_data_verified_at', 'update'),
  'authenticated cannot update sanitary or attestation columns');
select ok(
  (select bool_and(has_column_privilege('authenticated', 'public.studios', column_name, 'update'))
   from unnest(array['id','slug','legal_name','trade_name','tax_id','address','city',
     'postal_code','phone','created_at','updated_at']) columns(column_name)),
  'exact unrelated authenticated update columns are preserved');
select ok(
  (select bool_and(not has_column_privilege('anon', 'public.studios', column_name, 'update'))
   from information_schema.columns
   where table_schema = 'public' and table_name = 'studios'),
  'anon cannot update any studio column');
select ok(
  has_table_privilege('service_role', 'public.studios', 'update'),
  'service_role retains table-wide studio update');
select ok(
  has_schema_privilege('authenticated', 'private', 'usage')
  and not has_schema_privilege('anon', 'private', 'usage')
  and not has_schema_privilege('service_role', 'private', 'usage')
  and has_function_privilege('authenticated', 'private.is_valid_registration_number(text)', 'execute')
  and has_function_privilege('service_role', 'private.is_valid_registration_number(text)', 'execute')
  and not has_function_privilege('anon', 'private.is_valid_registration_number(text)', 'execute')
  and (select bool_and(not has_function_privilege(role_name, function_name, 'execute'))
    from unnest(array['anon','authenticated','service_role']) roles(role_name)
    cross join unnest(array['private.normalize_registration_number(text)',
      'private.clear_studio_health_verification()']) functions(function_name)),
  'private usage and helper execution follow the least-privilege role matrix');
create temporary table service_role_registration_probe (
  health_registration_number text,
  health_authorization_date date,
  health_data_verified_at timestamptz,
  constraint service_role_registration_probe_check check (
    health_data_verified_at is null
    or private.is_valid_registration_number(health_registration_number)
  )
);
create trigger service_role_registration_probe_clear
before update on service_role_registration_probe
for each row execute function private.clear_studio_health_verification();
grant select, insert, update on service_role_registration_probe to service_role;

set local role service_role;
select lives_ok($$insert into service_role_registration_probe values
  ('RG-SERVICE/1', null, timestamptz '2035-01-01 00:00:00+00')$$,
  'service_role valid insert satisfies the validator CHECK');
select throws_ok($$insert into service_role_registration_probe values
  ('demo', null, timestamptz '2035-01-01 00:00:00+00')$$,
  '23514', null, 'service_role invalid attestation is rejected by CHECK');
select lives_ok($$update service_role_registration_probe
  set health_registration_number = 'RG-SERVICE/2',
      health_data_verified_at = timestamptz '2036-01-01 00:00:00+00'$$,
  'service_role registration change executes the owner-safe trigger');
reset role;
select is((select health_data_verified_at from service_role_registration_probe),
  null::timestamptz, 'service_role registration change clears attestation');

set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000001', true);
select lives_ok($$update public.studios set legal_name = 'SYNTHETIC LEGAL UPDATED'
 where id = '61000000-0000-4000-8000-000000000001'$$,
 'authorized real-role update satisfies CHECK and trigger dependencies');
reset role;
select is(
  (select legal_name || '|' || coalesce(health_authorization_date::text, 'NULL') ||
     '|' || coalesce(health_data_verified_at::text, 'NULL')
   from public.studios where id = '61000000-0000-4000-8000-000000000001'),
  'SYNTHETIC LEGAL UPDATED|NULL|NULL',
  'real-role unrelated update succeeds without mutating sanitary history');

set local role anon;
select throws_ok($$update public.studios set legal_name = 'DENIED'
 where id = '61000000-0000-4000-8000-000000000001'$$,
 '42501', null, 'anon real-role studio update is denied');
reset role;

select * from finish();
rollback;
