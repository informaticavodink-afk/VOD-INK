begin;
select plan(29);

insert into public.studios(id,slug,legal_name,trade_name,tax_id,address,city,postal_code,phone,health_registration_number,health_authorization_date,health_data_verified_at) values
('64000000-0000-4000-8000-000000000001','synthetic-ready-a','SYNTHETIC LEGAL','SYNTHETIC TRADE','SYNTH-TAX','SYNTH ADDRESS','SYNTH CITY','00000','000000',' RG-READY ',date '2031-02-03',timestamptz '2031-02-04 05:06:07+00'),
('64000000-0000-4000-8000-000000000002','synthetic-ready-b','OTHER LEGAL','OTHER TRADE','OTHER-TAX','OTHER ADDRESS','OTHER CITY','11111','111111','RG-OTHER',null,null);
insert into auth.users(id,email) values('64000000-0000-4000-8001-000000000001','synthetic-ready-a@example.invalid'),('64000000-0000-4000-8001-000000000002','synthetic-ready-b@example.invalid');
insert into public.profiles(id,user_id,studio_id,role,full_name) values
('64000000-0000-4000-8002-000000000001','64000000-0000-4000-8001-000000000001','64000000-0000-4000-8000-000000000001','artist','SYNTHETIC ARTIST A'),
('64000000-0000-4000-8002-000000000002','64000000-0000-4000-8001-000000000002','64000000-0000-4000-8000-000000000002','owner','SYNTHETIC OWNER B');
create function pg_temp.ready(studio uuid,actor uuid,version text default 'registration-only-v2') returns jsonb language plpgsql as $$declare r jsonb;begin execute 'select to_jsonb(x) from public.get_studio_finalization_context_v2($1,$2,$3) x' into r using actor,studio,version;return r;exception when undefined_function then return '{"outcome_code":"MISSING"}';end$$;

select ok(to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)') is not null,'exact readiness signature exists');
select is((select proargnames from pg_proc where oid=to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)')),array['p_actor_profile_id','p_studio_id','p_contract_version','outcome_code','contract_version','legal_name','trade_name','tax_id','address','city','postal_code','phone','health_registration_number'],'exact narrow input and result fields');
select ok(not (select prosecdef from pg_proc where oid=to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)')),'readiness is security invoker');
select is((select proconfig from pg_proc where oid=to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)')),array['search_path=""'],'readiness has empty search_path');
select is((select proowner::regrole::text from pg_proc where oid=to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)')),'postgres','readiness owner is postgres');
select ok(has_function_privilege('service_role','public.get_studio_finalization_context_v2(uuid,uuid,text)','execute'),'service_role can execute readiness');
select ok(not has_function_privilege('authenticated','public.get_studio_finalization_context_v2(uuid,uuid,text)','execute'),'authenticated cannot execute readiness');
select ok(not has_function_privilege('anon','public.get_studio_finalization_context_v2(uuid,uuid,text)','execute'),'anon cannot execute readiness');
select ok(not exists(select from aclexplode((select proacl from pg_proc where oid=to_regprocedure('public.get_studio_finalization_context_v2(uuid,uuid,text)'))) where grantee=0 and privilege_type='EXECUTE'),'PUBLIC cannot execute readiness');
select ok(has_function_privilege('service_role','public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)','execute'),'settings v2 remains executable');
select ok(not has_function_privilege('service_role','public.update_studio_settings_as_manager(uuid,uuid,text,text,text,text,text,text,text,text,date,boolean)','execute'),'legacy signature remains installed but revoked before activation');

select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')->>'outcome_code','CONTRACT_DISABLED','disabled contract fails closed');
select ok((jsonb_strip_nulls(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')) - array['outcome_code','contract_version']) = '{}'::jsonb,'disabled result reveals no studio projection');
update private.registration_attestation_contract_state set enabled=true where singleton;
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001','mixed-v9')->>'outcome_code','CONTRACT_UNSUPPORTED','mixed version fails closed');
select ok((jsonb_strip_nulls(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001','mixed-v9')) - array['outcome_code','contract_version']) = '{}'::jsonb,'mixed-version result reveals no PII');
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000002')->>'outcome_code','FORBIDDEN','cross-studio actor is forbidden');
select is(pg_temp.ready('64000000-0000-4000-8000-000000000002','64000000-0000-4000-8002-000000000002')->>'outcome_code','REGISTRATION_UNATTESTED','unattested number is not ready');
update public.studios set health_registration_number='placeholder',health_data_verified_at=null where id='64000000-0000-4000-8000-000000000002';
select is(pg_temp.ready('64000000-0000-4000-8000-000000000002','64000000-0000-4000-8002-000000000002')->>'outcome_code','REGISTRATION_INVALID','invalid current number is not ready');
update public.studios set health_registration_number=null where id='64000000-0000-4000-8000-000000000002';
select is(pg_temp.ready('64000000-0000-4000-8000-000000000002','64000000-0000-4000-8002-000000000002')->>'outcome_code','REGISTRATION_MISSING','missing number is not ready');
select ok((jsonb_strip_nulls(pg_temp.ready('64000000-0000-4000-8000-000000000002','64000000-0000-4000-8002-000000000002')) - array['outcome_code','contract_version']) = '{}'::jsonb,'non-ready result reveals no PII');
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')->>'outcome_code','READY','attested current number is ready');
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')->>'health_registration_number','RG-READY','READY returns normalized current registration');
select is((select concat_ws('|',r->>'legal_name',r->>'trade_name',r->>'tax_id',r->>'address',r->>'city',r->>'postal_code',r->>'phone') from pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001') r),'SYNTHETIC LEGAL|SYNTHETIC TRADE|SYNTH-TAX|SYNTH ADDRESS|SYNTH CITY|00000|000000','READY returns the PDF studio projection');
select ok(not (pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001') ?| array['health_authorization_date','health_data_verified_at']),'readiness never exposes date or verification timestamp');
update public.studios set health_registration_number='  RG-READY  ' where id='64000000-0000-4000-8000-000000000001';
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')->>'outcome_code','READY','equivalent normalization preserves readiness');
select ok((select health_data_verified_at=timestamptz '2031-02-04 05:06:07+00' and health_authorization_date=date '2031-02-03' from public.studios where id='64000000-0000-4000-8000-000000000001'),'equivalent value preserves attestation and historical date');
select ok(not exists(select from public.audit_logs where action='studio_finalization_context_v2' and (metadata - array['outcome_code','contract_version'] <> '{}'::jsonb or metadata::text ~ 'RG-|SYNTHETIC')),'readiness audits have exact value-free metadata');
create function pg_temp.reject_readiness_audit() returns trigger language plpgsql as $$begin if new.action='studio_finalization_context_v2' then raise exception 'synthetic readiness audit failure';end if;return new;end$$;
create trigger reject_readiness_audit before insert on public.audit_logs for each row execute function pg_temp.reject_readiness_audit();
select throws_ok($$select pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')$$,'P0001','synthetic readiness audit failure','audit failure rejects readiness atomically');
drop trigger reject_readiness_audit on public.audit_logs;
set local role service_role;
select is(pg_temp.ready('64000000-0000-4000-8000-000000000001','64000000-0000-4000-8002-000000000001')->>'outcome_code','READY','real service_role readiness succeeds');
reset role;

select * from finish();
rollback;
