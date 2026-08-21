create function private.assert_registration_contract_activation_preconditions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_count integer;
  v_singleton boolean;
  v_contract_version text;
  v_enabled boolean;
  v_settings_v2 regprocedure :=
    'public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)'::regprocedure;
  v_finalization_v2 regprocedure :=
    'public.get_studio_finalization_context_v2(uuid,uuid,text)'::regprocedure;
  v_state_reader regprocedure :=
    'public.get_registration_attestation_contract_state()'::regprocedure;
  v_legacy_settings regprocedure :=
    'public.update_studio_settings_as_manager(uuid,uuid,text,text,text,text,text,text,text,text,date,boolean)'::regprocedure;
begin
  lock table private.registration_attestation_contract_state in share row exclusive mode;

  select count(*) into v_row_count
  from private.registration_attestation_contract_state;

  if v_row_count <> 1 then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract state must contain exactly one singleton row';
  end if;

  select singleton, contract_version, enabled
  into v_singleton, v_contract_version, v_enabled
  from private.registration_attestation_contract_state
  for update;

  if v_singleton is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract state must contain exactly one singleton row';
  end if;

  if v_contract_version is distinct from 'registration-only-v2' then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract version is unsupported';
  end if;

  if v_enabled is true then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract is already enabled';
  end if;

  if v_enabled is distinct from false then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract must be disabled before activation';
  end if;

  if to_regprocedure(v_settings_v2::text) is null
    or to_regprocedure(v_finalization_v2::text) is null
    or not has_function_privilege('service_role', v_settings_v2, 'execute')
    or not has_function_privilege('service_role', v_finalization_v2, 'execute')
    or has_function_privilege('authenticated', v_settings_v2, 'execute')
    or has_function_privilege('authenticated', v_finalization_v2, 'execute')
    or has_function_privilege('anon', v_settings_v2, 'execute')
    or has_function_privilege('anon', v_finalization_v2, 'execute')
    or (select prosecdef or proconfig is distinct from array['search_path=""']
        from pg_catalog.pg_proc where oid = v_settings_v2)
    or (select prosecdef or proconfig is distinct from array['search_path=""']
        from pg_catalog.pg_proc where oid = v_finalization_v2)
  then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation v2 RPC ACL invariant is not satisfied';
  end if;

  if to_regprocedure(v_state_reader::text) is null
    or not has_function_privilege('service_role', v_state_reader, 'execute')
    or has_function_privilege('authenticated', v_state_reader, 'execute')
    or has_function_privilege('anon', v_state_reader, 'execute')
    or not (select prosecdef and proconfig = array['search_path=""']
        from pg_catalog.pg_proc where oid = v_state_reader)
  then
    raise exception using
      errcode = '23514',
      message = 'Registration attestation contract reader ACL invariant is not satisfied';
  end if;

  if to_regprocedure(v_legacy_settings::text) is null
    or not has_function_privilege('service_role', v_legacy_settings, 'execute')
  then
    raise exception using
      errcode = '23514',
      message = 'Legacy studio settings RPC must remain executable during activation';
  end if;
end;
$$;

alter function private.assert_registration_contract_activation_preconditions() owner to postgres;
revoke all on function private.assert_registration_contract_activation_preconditions()
  from public, anon, authenticated, service_role;

select private.assert_registration_contract_activation_preconditions();

update private.registration_attestation_contract_state
set enabled = true
where singleton
  and contract_version = 'registration-only-v2'
  and enabled = false;