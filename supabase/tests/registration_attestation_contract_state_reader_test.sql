begin;
select plan(15);

select is(
  to_regprocedure('public.get_registration_attestation_contract_state()')::text,
  'get_registration_attestation_contract_state()',
  'fixed registration contract reader exists with no input parameters'
);
select is(
  (select proargnames from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')),
  array['contract_version', 'enabled'],
  'reader returns only the fixed contract version and enabled state'
);
select ok(
  (select prosecdef from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')),
  'reader is security definer so it does not expose the private table through the API'
);
select is(
  (select proconfig from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')),
  array['search_path=""'],
  'reader uses an empty controlled search path'
);
select is(
  (select proowner::regrole::text from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')),
  'postgres',
  'reader owner is postgres'
);
select is(
  (select provolatile::text from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')),
  's',
  'reader is declared stable and has a read-only SQL contract'
);
select ok(
  has_function_privilege('service_role', 'public.get_registration_attestation_contract_state()', 'execute')
  and not has_function_privilege('authenticated', 'public.get_registration_attestation_contract_state()', 'execute')
  and not has_function_privilege('anon', 'public.get_registration_attestation_contract_state()', 'execute')
  and not exists (
    select 1
    from aclexplode((select proacl from pg_proc where oid = to_regprocedure('public.get_registration_attestation_contract_state()')))
    where grantee = 0 and privilege_type = 'EXECUTE'
  ),
  'only service_role can execute the reader and PUBLIC has no execute grant'
);

set local role service_role;
select is(
  (select contract_version from public.get_registration_attestation_contract_state()),
  'registration-only-v2',
  'reader returns the exact fixed registration-only contract'
);
select is(
  (select enabled from public.get_registration_attestation_contract_state()),
  false,
  'reader returns Migration A disabled state'
);
reset role;

update private.registration_attestation_contract_state
set contract_version = 'unexpected-contract'
where singleton;
set local role service_role;
select is(
  (select count(*) from public.get_registration_attestation_contract_state()),
  0::bigint,
  'unexpected contract state returns no row so callers can fail closed'
);
reset role;

delete from private.registration_attestation_contract_state where singleton;
set local role service_role;
select is(
  (select count(*) from public.get_registration_attestation_contract_state()),
  0::bigint,
  'missing contract state returns no row so callers can fail closed'
);
reset role;

select ok(
  not has_table_privilege('anon', 'private.registration_attestation_contract_state', 'select')
  and not has_table_privilege('authenticated', 'private.registration_attestation_contract_state', 'select'),
  'API roles cannot select the private contract table'
);
select ok(
  has_schema_privilege('service_role', 'private', 'usage'),
  'service_role retains private schema usage required by the SECURITY INVOKER v2 RPCs'
);
select ok(
  has_table_privilege('service_role', 'private.registration_attestation_contract_state', 'select'),
  'service_role retains contract-state SELECT required by the SECURITY INVOKER v2 RPCs'
);
select ok(
  not has_function_privilege('anon', 'public.get_registration_attestation_contract_state()', 'execute')
  and not has_function_privilege('authenticated', 'public.get_registration_attestation_contract_state()', 'execute'),
  'API roles cannot use the public reader as a contract lookup'
);

select * from finish();
rollback;
