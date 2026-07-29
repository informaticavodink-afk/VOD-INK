create or replace function public.update_studio_settings_as_manager(
  p_actor_profile_id uuid,
  p_studio_id uuid,
  p_legal_name text,
  p_trade_name text,
  p_tax_id text,
  p_address text,
  p_city text,
  p_postal_code text,
  p_phone text,
  p_health_registration_number text,
  p_health_authorization_date date,
  p_attest_health_data boolean default false
)
returns public.studios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.studios;
  v_updated public.studios;
  v_registration text := nullif(btrim(p_health_registration_number), '');
  v_health_changed boolean;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_profile_id
      and studio_id = p_studio_id
      and role in ('owner', 'admin')
  ) then
    raise exception 'STUDIO_SETTINGS_FORBIDDEN';
  end if;

  if nullif(btrim(p_legal_name), '') is null
    or nullif(btrim(p_trade_name), '') is null
    or nullif(btrim(p_tax_id), '') is null
    or nullif(btrim(p_address), '') is null
    or nullif(btrim(p_city), '') is null
    or nullif(btrim(p_postal_code), '') is null
    or nullif(btrim(p_phone), '') is null then
    raise exception 'STUDIO_SETTINGS_REQUIRED_FIELDS';
  end if;

  if (v_registration is null) <> (p_health_authorization_date is null) then
    raise exception 'STUDIO_HEALTH_PARTIAL';
  end if;

  if p_health_authorization_date > timezone('Europe/Madrid', now())::date then
    raise exception 'STUDIO_HEALTH_DATE_FUTURE';
  end if;

  if v_registration = 'SAN/07/2024-C'
    and p_health_authorization_date = date '2024-06-15' then
    raise exception 'STUDIO_HEALTH_DEMO_VALUES';
  end if;

  if p_attest_health_data
    and (v_registration is null or p_health_authorization_date is null) then
    raise exception 'STUDIO_HEALTH_ATTESTATION_INCOMPLETE';
  end if;

  select *
  into v_current
  from public.studios
  where id = p_studio_id
  for update;

  if not found then
    raise exception 'STUDIO_SETTINGS_NOT_FOUND';
  end if;

  v_health_changed :=
    v_registration is distinct from nullif(btrim(v_current.health_registration_number), '')
    or p_health_authorization_date is distinct from v_current.health_authorization_date;

  update public.studios
  set
    legal_name = btrim(p_legal_name),
    trade_name = btrim(p_trade_name),
    tax_id = btrim(p_tax_id),
    address = btrim(p_address),
    city = btrim(p_city),
    postal_code = btrim(p_postal_code),
    phone = btrim(p_phone),
    health_registration_number = v_registration,
    health_authorization_date = p_health_authorization_date,
    health_data_verified_at = case
      when p_attest_health_data then timezone('utc', now())
      when v_health_changed then null
      else v_current.health_data_verified_at
    end,
    updated_at = timezone('utc', now())
  where id = p_studio_id
  returning * into v_updated;

  insert into public.audit_logs (
    studio_id,
    actor_profile_id,
    action,
    metadata
  )
  values (
    p_studio_id,
    p_actor_profile_id,
    case
      when p_attest_health_data then 'studio_health_attested'
      else 'studio_settings_updated'
    end,
    jsonb_build_object(
      'source', 'admin_panel',
      'health_data_changed', v_health_changed,
      'health_attested', p_attest_health_data
    )
  );

  return v_updated;
end;
$$;

revoke all on function public.update_studio_settings_as_manager(
  uuid, uuid, text, text, text, text, text, text, text, text, date, boolean
) from public, anon, authenticated;

grant execute on function public.update_studio_settings_as_manager(
  uuid, uuid, text, text, text, text, text, text, text, text, date, boolean
) to service_role;
