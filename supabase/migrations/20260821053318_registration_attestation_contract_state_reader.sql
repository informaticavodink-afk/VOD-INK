create function public.get_registration_attestation_contract_state()
returns table(contract_version text, enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select state.contract_version, state.enabled
  from private.registration_attestation_contract_state as state
  where state.singleton
    and state.contract_version = 'registration-only-v2'
$$;

alter function public.get_registration_attestation_contract_state() owner to postgres;
revoke all on function public.get_registration_attestation_contract_state()
  from PUBLIC, anon, authenticated, service_role;
grant execute on function public.get_registration_attestation_contract_state()
  to service_role;
