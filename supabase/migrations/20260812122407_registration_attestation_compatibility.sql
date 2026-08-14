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
create or replace function public.protect_signed_consent_document()
returns trigger language plpgsql set search_path = '' as $$ begin
if tg_op = 'DELETE' then
  if old.status = 'signed' then
    raise exception using errcode = '23514', message = 'A signed consent cannot be deleted';
  end if;
  return old;
end if;
if old.status = 'signed' and new.status is distinct from 'signed' then
  raise exception using errcode = '23514', message = 'A signed consent status is terminal';
end if;
if old.status = 'signed' and (new.document_snapshot is distinct from old.document_snapshot
  or new.document_template_version is distinct from old.document_template_version
  or new.final_file_id is distinct from old.final_file_id
  or new.finalization_started_at is distinct from old.finalization_started_at
  or new.finalized_at is distinct from old.finalized_at
  or new.signed_at is distinct from old.signed_at
  or new.legal_acceptance is distinct from old.legal_acceptance
  or new.finalization_content_sha256 is distinct from old.finalization_content_sha256) then
  raise exception using errcode = '23514', message = 'A signed consent document is immutable';
end if;
return new;
end $$;
create or replace function private.protect_signed_consent_file()
returns trigger language plpgsql security definer set search_path = '' as $$
declare signed_reference boolean;
begin
select c.status = 'signed' into signed_reference from public.consents c
where c.final_file_id = old.id and c.status = 'signed' for share;
if coalesce(signed_reference, false) then
  if tg_op = 'DELETE' then raise exception using errcode = '23514',
    message = 'A signed consent final file cannot be deleted'; end if;
  if (to_jsonb(new) - array['drive_file_id','drive_view_link','drive_copy_claimed_at','drive_copy_completed_at'])
    is distinct from (to_jsonb(old) - array['drive_file_id','drive_view_link','drive_copy_claimed_at','drive_copy_completed_at']) then
    raise exception using errcode = '23514', message = 'A signed consent final file is immutable';
  end if;
end if;
if tg_op = 'DELETE' then return old; end if; return new;
end $$;
alter function private.protect_signed_consent_file() owner to postgres;
revoke all on function private.protect_signed_consent_file() from PUBLIC, anon, authenticated, service_role;
drop trigger if exists consent_files_protect_signed_relationship on public.consent_files;
create trigger consent_files_protect_signed_relationship before update or delete
on public.consent_files for each row execute function private.protect_signed_consent_file();
drop trigger consents_protect_signed_document on public.consents;
create trigger consents_protect_signed_document before update or delete on public.consents
for each row execute function public.protect_signed_consent_document();
alter table public.consent_files drop constraint consent_files_consent_id_fkey;
alter table public.consent_files add constraint consent_files_consent_id_fkey
foreign key (consent_id) references public.consents(id) on delete restrict;
create or replace function private.protect_signed_consent_storage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare signed_reference boolean;
begin
select c.status = 'signed' into signed_reference from public.consent_files f
join public.consents c on c.final_file_id = f.id
where f.bucket_id = old.bucket_id and f.storage_path = old.name for share of c;
if coalesce(signed_reference, false) then raise exception using errcode = '23514',
  message = 'A signed consent Storage object is immutable'; end if;
if tg_op = 'DELETE' then return old; end if; return new;
end $$;
alter function private.protect_signed_consent_storage() owner to postgres;
revoke all on function private.protect_signed_consent_storage() from PUBLIC, anon, authenticated, service_role;
create trigger protect_signed_consent_storage before update or delete on storage.objects
for each row execute function private.protect_signed_consent_storage();
