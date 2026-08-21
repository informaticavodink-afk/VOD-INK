begin;
select plan(15);

select ok(
  to_regprocedure('private.assert_registration_contract_activation_preconditions()') is not null,
  'activation precondition assertion exists'
);
select is(
  (select enabled from private.registration_attestation_contract_state where singleton),
  true,
  'activation migration leaves the exact contract enabled'
);
select ok(
  has_function_privilege('service_role', 'public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)', 'execute')
  and has_function_privilege('service_role', 'public.get_studio_finalization_context_v2(uuid,uuid,text)', 'execute'),
  'service_role retains both v2 RPC grants'
);
select ok(
  not has_function_privilege('authenticated', 'public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)', 'execute')
  and not has_function_privilege('anon', 'public.get_studio_finalization_context_v2(uuid,uuid,text)', 'execute'),
  'API roles retain no v2 RPC grant'
);
select ok(
  has_function_privilege('service_role', 'public.update_studio_settings_as_manager(uuid,uuid,text,text,text,text,text,text,text,text,date,boolean)', 'execute'),
  'legacy date RPC remains executable after activation'
);
select ok(
  not has_function_privilege('public', 'private.assert_registration_contract_activation_preconditions()', 'execute')
  and not has_function_privilege('service_role', 'private.assert_registration_contract_activation_preconditions()', 'execute'),
  'activation assertion is not callable through PUBLIC or service_role'
);

update private.registration_attestation_contract_state set enabled = false where singleton;
select lives_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  'exact disabled singleton satisfies activation preconditions'
);
update private.registration_attestation_contract_state set enabled = true where singleton;
select throws_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  '23514',
  'Registration attestation contract is already enabled',
  'already-enabled state rejects another activation'
);

alter table private.registration_attestation_contract_state
  drop constraint registration_attestation_contract_state_pkey;
alter table private.registration_attestation_contract_state
  drop constraint registration_attestation_contract_state_singleton_check;
insert into private.registration_attestation_contract_state(singleton, contract_version, enabled)
values (false, 'other-contract', false);
select throws_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  '23514',
  'Registration attestation contract state must contain exactly one singleton row',
  'ambiguous contract state rejects activation'
);
delete from private.registration_attestation_contract_state where singleton = false;
update private.registration_attestation_contract_state
set enabled = false, contract_version = 'unexpected-contract'
where singleton;
select throws_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  '23514',
  'Registration attestation contract version is unsupported',
  'unexpected contract version rejects activation'
);
update private.registration_attestation_contract_state
set contract_version = 'registration-only-v2'
where singleton;

delete from private.registration_attestation_contract_state where singleton;
select throws_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  '23514',
  'Registration attestation contract state must contain exactly one singleton row',
  'missing contract state rejects activation'
);
insert into private.registration_attestation_contract_state(singleton, contract_version, enabled)
values (true, 'registration-only-v2', false);
select lives_ok(
  'select private.assert_registration_contract_activation_preconditions()',
  'restored exact disabled singleton remains activatable'
);
update private.registration_attestation_contract_state set enabled = true where singleton;
select is(
  (select contract_version || ':' || enabled from private.registration_attestation_contract_state where singleton),
  'registration-only-v2:true',
  'activation updates only the exact singleton to enabled'
);
select ok(
  (select count(*) = 1 from private.registration_attestation_contract_state),
  'activation leaves exactly one contract row'
);
select ok(
  not exists (
    select 1
    from aclexplode((select proacl from pg_proc where oid = to_regprocedure('private.assert_registration_contract_activation_preconditions()')))
    where grantee = 0 and privilege_type = 'EXECUTE'
  ),
  'activation assertion has no PUBLIC execute grant'
);

select * from finish();
rollback;