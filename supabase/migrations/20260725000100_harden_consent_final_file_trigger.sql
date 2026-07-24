-- The final-file validator is a trigger helper, not a public RPC.
-- Run with the caller's privileges and remove Data API execution grants.

create or replace function public.validate_consent_final_file()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  matched boolean;
begin
  if new.final_file_id is null then
    if new.status = 'signed' then
      raise exception 'A signed consent requires final_file_id';
    end if;
    return new;
  end if;

  select exists (
    select 1
    from public.consent_files f
    where f.id = new.final_file_id
      and f.consent_id = new.id
      and f.document_kind = 'final'
  ) into matched;

  if not matched then
    raise exception 'final_file_id must reference this consent final document';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_consent_final_file() from public;
revoke all on function public.validate_consent_final_file() from anon;
revoke all on function public.validate_consent_final_file() from authenticated;
revoke all on function public.protect_signed_consent_document() from public;
revoke all on function public.protect_signed_consent_document() from anon;
revoke all on function public.protect_signed_consent_document() from authenticated;
