-- Conservative rollout backfill; ambiguous legacy rows remain nullable for review.
create or replace function private.backfill_consent_representation()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_ids uuid[];
  target_id uuid;
  updated_count bigint;
begin
  select array_agg(id order by id)
  into target_ids
  from (
    select id
    from public.studios
    where slug = 'vod-ink'
    for update
  ) targets;

  if coalesce(cardinality(target_ids), 0) <> 1 then
    raise exception 'vod-ink studio target must be unique'
      using errcode = 'P0001';
  end if;
  target_id := target_ids[1];

  with candidates as (
    select id, is_minor, num_nonnulls(
      representative_full_name, representative_dni, representative_birth_date,
      representative_phone, representative_address, representative_postal_code,
      representative_city, representative_relationship, representative_accreditation
    ) representative_count
    from public.consents
    where studio_id = target_id and has_legal_representative is null
  )
  update public.consents consents
  set has_legal_representative = candidates.representative_count = 9
  from candidates
  where consents.id = candidates.id
    and (
      candidates.representative_count = 9
      or (not candidates.is_minor and candidates.representative_count = 0)
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function private.backfill_consent_representation()
  from public, anon, authenticated;

select private.backfill_consent_representation();
