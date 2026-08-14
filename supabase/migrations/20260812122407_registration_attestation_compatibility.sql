lock table public.consent_files in share row exclusive mode;
lock table public.consents in share row exclusive mode;
do $$ begin
  if exists (select 1 from public.consents c left join public.consent_files f
    on f.id = c.final_file_id and f.consent_id = c.id and f.document_kind = 'final'
    where c.status = 'signed' and f.id is null) then
    raise exception using errcode = '23514',
      message = 'Signed consent history contains an invalid final file relationship';
  end if;
  if exists (select 1 from public.consents where status = 'signed' and
    (document_template_version is null or document_template_version not in
      ('legacy','consent-v2','consent-v3-representation','consent-v4-registration-only'))) then
    raise exception using errcode = '23514',
      message = 'Signed consent history contains a null or unsupported document version';
  end if;
end $$;
create or replace function private.normalize_registration_number(value text)
returns text language sql immutable parallel safe security invoker set search_path = ''
as $$ select btrim(value, E' \t\n\r\f\v') $$;
create or replace function private.is_valid_registration_number(value text)
returns boolean language sql immutable parallel safe security definer set search_path = ''
as $$
  select coalesce(
    char_length(private.normalize_registration_number(value)) between 1 and 120
    and lower(private.normalize_registration_number(value)) not in (
      'san/07/2024-c', 'n/a', 'na', 'pendiente', 'por determinar',
      'placeholder', 'demo', 'test', 'prueba', 'ejemplo'
    )
    and private.normalize_registration_number(value) !~ '^(\[.*\]|<.*>|\{.*\})$'
    and private.normalize_registration_number(value)
      !~* '^(SYNTH|SYNTHETIC|TEST|DEMO|FAKE)[-_/:]',
    false
  )
$$;
revoke all on function private.normalize_registration_number(text)
  from PUBLIC, anon, authenticated, service_role;
revoke all on function private.is_valid_registration_number(text)
  from PUBLIC, anon, authenticated, service_role;
alter function private.normalize_registration_number(text) owner to postgres;
alter function private.is_valid_registration_number(text) owner to postgres;
grant execute on function private.is_valid_registration_number(text)
  to authenticated, service_role;
create or replace function private.clear_studio_health_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_registration text := private.normalize_registration_number(old.health_registration_number);
  new_registration text := private.normalize_registration_number(new.health_registration_number);
begin
  new.health_registration_number := nullif(new_registration, '');
  if new_registration is distinct from old_registration then
    new.health_data_verified_at := null;
  elsif new.health_authorization_date is distinct from old.health_authorization_date
    and new.health_data_verified_at is distinct from old.health_data_verified_at then
    new.health_data_verified_at := old.health_data_verified_at;
  end if;
  return new;
end;
$$;
revoke all on function private.clear_studio_health_verification()
  from PUBLIC, anon, authenticated, service_role;
alter function private.clear_studio_health_verification() owner to postgres;
alter table public.studios drop constraint studios_health_data_verified_check;
alter table public.studios add constraint studios_health_data_verified_check check (
  health_data_verified_at is null
  or private.is_valid_registration_number(health_registration_number)
);
revoke update on public.studios from PUBLIC, anon, authenticated;
revoke update (
  id, slug, legal_name, trade_name, tax_id, address, city, postal_code, phone,
  health_registration_number, health_authorization_date, health_data_verified_at,
  created_at, updated_at
) on public.studios from PUBLIC, anon, authenticated;
grant update (
  id, slug, legal_name, trade_name, tax_id, address, city, postal_code, phone,
  created_at, updated_at
) on public.studios to authenticated;
grant update on public.studios to service_role;
create or replace function private.assert_all_signed_consent_history_supported()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.consents c left join public.consent_files f
    on f.id = c.final_file_id and f.consent_id = c.id and f.document_kind = 'final'
    where c.status = 'signed' and f.id is null) then
    raise exception using errcode = '23514',
      message = 'Signed consent history contains an invalid final file relationship';
  end if;
  if exists (select 1 from public.consents where status = 'signed' and
    (document_template_version is null or document_template_version not in
      ('legacy','consent-v2','consent-v3-representation','consent-v4-registration-only'))) then
    raise exception using errcode = '23514',
      message = 'Signed consent history contains a null or unsupported document version';
  end if;
end;
$$;
alter function private.assert_all_signed_consent_history_supported() owner to postgres;
revoke all on function private.assert_all_signed_consent_history_supported()
  from PUBLIC, anon, authenticated, service_role;
select private.assert_all_signed_consent_history_supported();
create or replace function public.validate_consent_final_file()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  matched boolean := false;
begin
  if new.status = 'signed' and new.document_template_version is null then
    raise exception using errcode = '23514',
      message = 'A signed consent requires document_template_version';
  end if;
  if new.final_file_id is null then
    if new.status = 'signed' then
      raise exception using errcode = '23514',
        message = 'A signed consent requires final_file_id';
    end if;
    return new;
  end if;
  perform 1 from public.consent_files f where f.id = new.final_file_id
    and f.consent_id = new.id and f.document_kind = 'final' for share;
  matched := found;
  if not matched then
    raise exception using errcode = '23514',
message = 'final_file_id must reference this consent final document';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_consent_final_file()
  from PUBLIC, anon, authenticated;
