begin;
select plan(37);

insert into public.studios(id,slug,legal_name,trade_name,tax_id,address,city,postal_code,phone,health_registration_number,health_authorization_date,health_data_verified_at) values
('63000000-0000-4000-8000-000000000001','synthetic-v2-a','SYNTHETIC LEGAL','SYNTHETIC TRADE','SYNTH-TAX','SYNTH ADDRESS','SYNTH CITY','00000','000000',' RG-OLD ',date '2030-01-02',timestamptz '2030-01-03 04:05:06+00'),
('63000000-0000-4000-8000-000000000002','synthetic-v2-b','SYNTHETIC LEGAL','SYNTHETIC TRADE','SYNTH-TAX','SYNTH ADDRESS','SYNTH CITY','00000','000000','RG-NULL-DATE',null,null);
insert into auth.users(id,email) values('63000000-0000-4000-8001-000000000001','synthetic-v2-a@example.invalid'),('63000000-0000-4000-8001-000000000002','synthetic-v2-b@example.invalid');
insert into public.profiles(id,user_id,studio_id,role,full_name) values
('63000000-0000-4000-8002-000000000001','63000000-0000-4000-8001-000000000001','63000000-0000-4000-8000-000000000001','owner','SYNTHETIC OWNER A'),
('63000000-0000-4000-8002-000000000002','63000000-0000-4000-8001-000000000002','63000000-0000-4000-8000-000000000002','owner','SYNTHETIC OWNER B');
create function pg_temp.contract_state() returns text language plpgsql as $$declare r text;begin execute 'select contract_version||'':''||enabled from private.registration_attestation_contract_state where singleton' into r;return r;exception when undefined_table then return 'MISSING';end$$;
create function pg_temp.call_v2(studio uuid,actor uuid,registration text,attest boolean,version text default 'registration-only-v2') returns jsonb language plpgsql as $$declare r jsonb;begin execute 'select to_jsonb(x) from public.update_studio_settings_as_manager_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) x' into r using actor,studio,'SYNTHETIC LEGAL','SYNTHETIC TRADE','SYNTH-TAX','SYNTH ADDRESS','SYNTH CITY','00000','000000',registration,attest,version;return r;exception when undefined_function then return '{"outcome_code":"MISSING"}';end$$;

select ok(to_regclass('private.registration_attestation_contract_state') is not null,'private contract-state table exists');
select is(pg_temp.contract_state(),'registration-only-v2:false','exact singleton contract starts disabled');
select ok(to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)') is not null,'exact v2 input signature exists');
select is((select proargnames from pg_proc where oid=to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)')),array['p_actor_profile_id','p_studio_id','p_legal_name','p_trade_name','p_tax_id','p_address','p_city','p_postal_code','p_phone','p_health_registration_number','p_attest_health_data','p_contract_version','outcome_code','attested','contract_version'],'exact input and result field contract');
select ok(not (select prosecdef from pg_proc where oid=to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)')),'v2 RPC is security invoker');
select is((select proconfig from pg_proc where oid=to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)')),array['search_path=""'],'v2 RPC has empty search_path');
select is((select proowner::regrole::text from pg_proc where oid=to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)')),'postgres','v2 RPC owner is postgres');
select ok(has_function_privilege('service_role','public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)','execute'),'service_role can execute v2 RPC');
select ok(not has_function_privilege('authenticated','public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)','execute'),'authenticated cannot execute v2 RPC');
select ok(not has_function_privilege('anon','public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)','execute'),'anon cannot execute v2 RPC');
select ok(not exists(select from aclexplode((select proacl from pg_proc where oid=to_regprocedure('public.update_studio_settings_as_manager_v2(uuid,uuid,text,text,text,text,text,text,text,text,boolean,text)'))) where grantee=0 and privilege_type='EXECUTE'),'PUBLIC cannot execute v2 RPC');
select ok(not has_function_privilege('service_role','public.update_studio_settings_as_manager(uuid,uuid,text,text,text,text,text,text,text,text,date,boolean)','execute'),'legacy date RPC execute is revoked');
select ok(has_table_privilege('service_role','private.registration_attestation_contract_state','select'),'service_role can read exact contract row');
select ok(not has_table_privilege('authenticated','private.registration_attestation_contract_state','select'),'authenticated cannot read contract row');

select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',true)->>'outcome_code','CONTRACT_DISABLED','disabled contract fails closed');
select is((select btrim(health_registration_number)||':'||(health_data_verified_at is not null)::text from public.studios where id='63000000-0000-4000-8000-000000000001'),'RG-OLD:true','disabled attempt does not mutate settings');
select ok((select metadata ?& array['attempted_action','outcome_code','attested','contract_version'] and metadata::text !~ 'RG-' from public.audit_logs where studio_id='63000000-0000-4000-8000-000000000001' order by created_at desc limit 1),'disabled attempt emits durable privacy-safe audit');
update private.registration_attestation_contract_state set enabled=true where singleton;
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',false,'unsupported-v9')->>'outcome_code','CONTRACT_UNSUPPORTED','unsupported contract fails closed');
select is((select btrim(health_registration_number) from public.studios where id='63000000-0000-4000-8000-000000000001'),'RG-OLD','unsupported attempt does not mutate');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000002','RG-OLD',false)->>'outcome_code','FORBIDDEN','cross-studio actor is forbidden');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','placeholder',true)->>'outcome_code','REGISTRATION_INVALID','semantic registration rejection is stable');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','  RG-OLD  ',false)->>'outcome_code','REGISTRATION_UNCHANGED','equivalent normalized value is unchanged');
select is((select health_data_verified_at::text||':'||health_authorization_date::text from public.studios where id='63000000-0000-4000-8000-000000000001'),'2030-01-03 04:05:06+00:2030-01-02','equivalent update preserves attestation and historical date');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',true)->>'outcome_code','REGISTRATION_CHANGED_REATTEST_REQUIRED','changed number requires a separate attestation step');
select is((select health_registration_number||':'||(health_data_verified_at is null)::text||':'||health_authorization_date::text from public.studios where id='63000000-0000-4000-8000-000000000001'),'RG-NEW:true:2030-01-02','change invalidates attestation without touching date');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',true)->>'outcome_code','REGISTRATION_ATTESTED','explicit second step attests current number');
select ok((select health_data_verified_at is not null and health_authorization_date=date '2030-01-02' from public.studios where id='63000000-0000-4000-8000-000000000001'),'attestation timestamp binds without changing date');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',true)->>'outcome_code','REGISTRATION_REATTESTED','explicit repeat is a stable re-attestation');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',false)->>'outcome_code','REGISTRATION_UNCHANGED','attested unchanged update stays unchanged');
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000002','63000000-0000-4000-8002-000000000002','RG-NULL-DATE',true)->>'outcome_code','REGISTRATION_ATTESTED','null historical date is ignored by attestation');
select ok((select health_authorization_date is null and health_data_verified_at is not null from public.studios where id='63000000-0000-4000-8000-000000000002'),'null date remains unchanged');
select is((select array_agg(distinct action order by action) from public.audit_logs where studio_id in('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002')),array['studio_registration_attestation_v2'],'audit action is fixed and value-free');
select ok(not exists(select from public.audit_logs where studio_id in('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002') and (not metadata ?& array['attested','attempted_action','contract_version','outcome_code'] or metadata - array['attested','attempted_action','contract_version','outcome_code'] <> '{}'::jsonb)),'audit metadata has the exact safe key allowlist');
select ok(not exists(select from public.audit_logs where studio_id in('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000002') and metadata::text ~ 'RG-(OLD|NEW|NULL|ROLLBACK)|SYNTHETIC'),'audit metadata contains no submitted values or PII');
create function pg_temp.reject_v2_audit() returns trigger language plpgsql as $$begin if new.action='studio_registration_attestation_v2' then raise exception 'synthetic audit failure';end if;return new;end$$;
create trigger reject_v2_audit before insert on public.audit_logs for each row execute function pg_temp.reject_v2_audit();
select throws_ok($$select pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-ROLLBACK',false)$$,'P0001','synthetic audit failure','audit failure rejects the whole RPC statement');
select is((select health_registration_number from public.studios where id='63000000-0000-4000-8000-000000000001'),'RG-NEW','audit failure rolls back settings mutation');
drop trigger reject_v2_audit on public.audit_logs;
set local role service_role;
select is(pg_temp.call_v2('63000000-0000-4000-8000-000000000001','63000000-0000-4000-8002-000000000001','RG-NEW',false)->>'outcome_code','REGISTRATION_UNCHANGED','real service_role invocation succeeds');
reset role;

select * from finish();
rollback;
