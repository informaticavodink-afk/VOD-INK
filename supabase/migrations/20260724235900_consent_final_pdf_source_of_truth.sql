-- Make the final consent PDF explicit, unique and immutable.

alter table public.consent_files
  add column if not exists document_kind text not null default 'legacy';

alter table public.consent_files
  drop constraint if exists consent_files_document_kind_check;

alter table public.consent_files
  add constraint consent_files_document_kind_check
  check (document_kind in ('client_evidence', 'final', 'legacy'));

update public.consent_files
set document_kind = 'client_evidence'
where storage_path like '%/client-signed.pdf';

-- Only classify an historical artist PDF automatically when it is unambiguous.
with final_candidates as (
  select consent_id, min(id::text)::uuid as file_id
  from public.consent_files
  where storage_path like '%/artist-signed.pdf'
  group by consent_id
  having count(*) = 1
)
update public.consent_files files
set document_kind = 'final'
from final_candidates candidates
where files.id = candidates.file_id;

create unique index if not exists consent_files_one_final_per_consent
  on public.consent_files (consent_id)
  where document_kind = 'final';

alter table public.consents
  add column if not exists document_snapshot jsonb,
  add column if not exists document_template_version text,
  add column if not exists final_file_id uuid,
  add column if not exists finalization_started_at timestamptz,
  add column if not exists finalized_at timestamptz;

alter table public.consents
  drop constraint if exists consents_final_file_id_fkey;

alter table public.consents
  add constraint consents_final_file_id_fkey
  foreign key (final_file_id) references public.consent_files(id) on delete restrict;

update public.consents consents
set final_file_id = files.id,
    finalized_at = coalesce(consents.signed_at, files.created_at),
    document_template_version = coalesce(consents.document_template_version, 'legacy')
from public.consent_files files
where files.consent_id = consents.id
  and files.document_kind = 'final'
  and consents.final_file_id is null;

create or replace function public.validate_consent_final_file()
returns trigger
language plpgsql
security definer
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

create or replace function public.protect_signed_consent_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'signed' and (
    new.document_snapshot is distinct from old.document_snapshot
    or new.document_template_version is distinct from old.document_template_version
    or new.final_file_id is distinct from old.final_file_id
    or new.finalization_started_at is distinct from old.finalization_started_at
    or new.finalized_at is distinct from old.finalized_at
  ) then
    raise exception 'A signed consent document is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists consents_validate_final_file on public.consents;
create trigger consents_validate_final_file
before insert or update of final_file_id, status on public.consents
for each row execute function public.validate_consent_final_file();

drop trigger if exists consents_protect_signed_document on public.consents;
create trigger consents_protect_signed_document
before update on public.consents
for each row execute function public.protect_signed_consent_document();

-- Diagnostic query for manual review after deployment:
-- select c.id, c.status, count(f.id) as artist_pdf_candidates
-- from public.consents c
-- left join public.consent_files f
--   on f.consent_id = c.id and f.storage_path like '%/artist-signed.pdf'
-- where c.status = 'signed' and c.final_file_id is null
-- group by c.id, c.status;
