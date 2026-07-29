-- Scoped, rerunnable repair for the one configured VOD-INK studio.
create or replace function private.repair_vod_ink_studio()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_ids uuid[];
  target_id uuid;
  receipt text;
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

  select case
    when health_registration_number = 'SAN/07/2024-C'
      and health_authorization_date = date '2024-06-15'
      then 'sanitary_demo_pair_cleared'
    when health_registration_number is null
      and health_authorization_date is null
      then 'sanitary_empty'
    else 'sanitary_review_required'
  end
  into receipt
  from public.studios
  where id = target_id;

  update public.studios
  set legal_name = 'vod ink',
      trade_name = 'vod ink',
      address = 'calle la peña 107 bajo',
      city = 'Santander',
      postal_code = '39011',
      tax_id = '72203726X',
      phone = '659937105',
      health_registration_number = case
        when receipt = 'sanitary_demo_pair_cleared' then null
        else health_registration_number
      end,
      health_authorization_date = case
        when receipt = 'sanitary_demo_pair_cleared' then null
        else health_authorization_date
      end,
      health_data_verified_at = null
  where id = target_id;

  return receipt;
end;
$$;

revoke all on function private.repair_vod_ink_studio()
  from public, anon, authenticated;

select private.repair_vod_ink_studio();
