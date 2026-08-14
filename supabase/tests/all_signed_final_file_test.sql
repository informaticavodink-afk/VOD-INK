begin;
select plan(63);

insert into public.studios(id,slug,legal_name,trade_name) values
('62000000-0000-4000-8000-000000000001','synthetic-a2a','SYNTHETIC A2A STUDIO','SYNTHETIC A2A STUDIO');
insert into public.artists(id,studio_id,full_name,dni,qualification) values
('62000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','SYNTHETIC A2A ARTIST','SYNTHETIC-A2A-DNI','SYNTHETIC');
create function pg_temp.add_consent(n int,v text,s public.consent_status default 'pending_artist') returns text language plpgsql as $$begin
 insert into public.consents(id,studio_id,artist_id,client_full_name,client_dni,idempotency_key,is_minor,has_legal_representative,status,document_template_version)
 values(('62000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'62000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000002','SYNTHETIC A2A CLIENT','SYNTHETIC-'||n,'synthetic-a2a-'||n,false,false,s,v); return 'accepted';
exception when others then return sqlstate; end$$;
create function pg_temp.sign_consent(n int,file_n int) returns text language plpgsql as $$begin
 update public.consents set final_file_id=('62000000-0000-4000-8001-'||lpad(file_n::text,12,'0'))::uuid,status='signed',signed_at=clock_timestamp(),finalization_started_at=clock_timestamp(),finalized_at=clock_timestamp(),document_snapshot='{"synthetic":true}',legal_acceptance='{"synthetic":true}' where id=('62000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid; return 'accepted';
exception when others then return sqlstate; end$$;
select is(pg_temp.add_consent(n,v,'signed'),'23514','signed null final rejected: '||coalesce(v,'NULL')) from (values(10,'legacy'),(11,'consent-v2'),(12,'consent-v3-representation'),(13,'consent-v4-registration-only'),(14,'consent-v5-future')) x(n,v);
select pg_temp.add_consent(n,v) from (values(20,'legacy'),(21,'consent-v2'),(22,'consent-v3-representation'),(23,'consent-v4-registration-only'),(24,'consent-v5-future'),(25,'consent-v4-registration-only'),(26,'consent-v4-registration-only'),(27,null)) x(n,v);
insert into public.consent_files(id,consent_id,studio_id,artist_id,storage_path,file_name,document_kind,sha256,size_bytes)
select ('62000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,('62000000-0000-4000-8000-'||lpad(c::text,12,'0'))::uuid,'62000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000002',case when n=23 then 'studios/62000000-0000-4000-8000-000000000001/final-23.pdf' else 'synthetic-a2a/'||n||'.pdf' end,n||'.pdf',k,'synthetic-'||n,n from (values(20,20,'final'),(21,21,'final'),(22,22,'final'),(23,23,'final'),(24,24,'final'),(25,25,'client_evidence'),(26,26,'final'),(27,27,'final')) x(n,c,k);
select ok((select status='pending_artist' and final_file_id is null from public.consents where id='62000000-0000-4000-8000-000000000026'),'unsigned null final remains compatible');
select throws_ok($$update public.consents set final_file_id='62000000-0000-4000-8001-000000000027',status='signed' where id='62000000-0000-4000-8000-000000000027'$$,'23514','A signed consent requires document_template_version','signed null version with own final file is rejected exactly');
select ok((select status='pending_artist' and final_file_id is null and document_template_version is null from public.consents where id='62000000-0000-4000-8000-000000000027'),'failed null-version transition preserves row state');
select is(array(select pg_temp.sign_consent(n,n) from generate_series(20,23)n),array['accepted','accepted','accepted','accepted'],'all pinned supported versions sign with own final file');
select throws_ok($$update public.consents set final_file_id='62000000-0000-4000-8001-000000000021',status='signed' where id='62000000-0000-4000-8000-000000000026'$$,'23514','final_file_id must reference this consent final document','wrong-consent relationship rejected exactly');
select throws_ok($$update public.consents set final_file_id='62000000-0000-4000-8001-000000000025',status='signed' where id='62000000-0000-4000-8000-000000000025'$$,'23514','final_file_id must reference this consent final document','non-final relationship rejected exactly');
select throws_ok($$update public.consents set status='signed' where id='62000000-0000-4000-8000-000000000026'$$,'23514','A signed consent requires final_file_id','status-first transition fails exactly');
select ok((select status='pending_artist' and final_file_id is null from public.consents where id='62000000-0000-4000-8000-000000000026'),'failed relationship/status transitions preserve row state');
select lives_ok('select private.assert_all_signed_consent_history_supported()','preflight accepts supported signed history before future fixture is signed');
select is(pg_temp.sign_consent(24,24),'accepted','future non-null runtime version signs with own final file');

select pg_temp.add_consent(30,'consent-v4-registration-only');
insert into public.consent_files(id,consent_id,studio_id,artist_id,storage_path,file_name,document_kind,sha256,size_bytes) values
('62000000-0000-4000-8001-000000000030','62000000-0000-4000-8000-000000000030','62000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000002','synthetic-a2a/30.pdf','30.pdf','final','synthetic-30',30);

alter table public.consents disable trigger consents_validate_final_file;
alter table public.consents disable trigger consents_protect_signed_document;
update public.consents set status='signed' where id='62000000-0000-4000-8000-000000000030';
alter table public.consents enable trigger consents_validate_final_file;
alter table public.consents enable trigger consents_protect_signed_document;
select throws_ok('select private.assert_all_signed_consent_history_supported()','23514','Signed consent history contains an invalid final file relationship','preflight rejects missing signed relationship exactly');
alter table public.consents disable trigger consents_protect_signed_document;
alter table public.consents disable trigger consents_validate_final_file;
update public.consents set final_file_id='62000000-0000-4000-8001-000000000030',document_template_version=null where id='62000000-0000-4000-8000-000000000030';
alter table public.consents enable trigger consents_validate_final_file;
alter table public.consents enable trigger consents_protect_signed_document;
select throws_ok('select private.assert_all_signed_consent_history_supported()','23514','Signed consent history contains a null or unsupported document version','preflight rejects null signed version exactly');
alter table public.consents disable trigger consents_protect_signed_document;
update public.consents set document_template_version='consent-v5-unsupported' where id='62000000-0000-4000-8000-000000000030';
alter table public.consents enable trigger consents_protect_signed_document;
select throws_ok('select private.assert_all_signed_consent_history_supported()','23514','Signed consent history contains a null or unsupported document version','preflight rejects unsupported signed version exactly');
select ok((select status='signed' and final_file_id='62000000-0000-4000-8001-000000000030' from public.consents where id='62000000-0000-4000-8000-000000000030'),'failed preflights preserve signed relationship state');
alter table public.consents disable trigger consents_validate_final_file;
alter table public.consents disable trigger consents_protect_signed_document;
update public.consents set final_file_id='62000000-0000-4000-8001-000000000021' where id='62000000-0000-4000-8000-000000000020';
alter table public.consents enable trigger consents_protect_signed_document;
alter table public.consents enable trigger consents_validate_final_file;
select throws_ok('select private.assert_all_signed_consent_history_supported()','23514','Signed consent history contains an invalid final file relationship','preflight rejects wrong-consent signed relationship exactly');
alter table public.consents disable trigger consents_validate_final_file;
alter table public.consents disable trigger consents_protect_signed_document;
update public.consents set final_file_id='62000000-0000-4000-8001-000000000020' where id='62000000-0000-4000-8000-000000000020';
alter table public.consents enable trigger consents_protect_signed_document;
alter table public.consents enable trigger consents_validate_final_file;
alter table public.consent_files disable trigger consent_files_protect_signed_relationship;
update public.consent_files set document_kind='client_evidence' where id='62000000-0000-4000-8001-000000000020';
alter table public.consent_files enable trigger consent_files_protect_signed_relationship;
select throws_ok('select private.assert_all_signed_consent_history_supported()','23514','Signed consent history contains an invalid final file relationship','preflight rejects non-final signed relationship exactly');
alter table public.consent_files disable trigger consent_files_protect_signed_relationship;
update public.consent_files set document_kind='final' where id='62000000-0000-4000-8001-000000000020';
alter table public.consent_files enable trigger consent_files_protect_signed_relationship;
select throws_ok($$update public.consents set status='pending_artist' where id='62000000-0000-4000-8000-000000000023'$$,'23514','A signed consent status is terminal','signed status is terminal');
select throws_ok(format('update public.consents set %s where id=%L',assignment,'62000000-0000-4000-8000-000000000023'),'23514','A signed consent document is immutable','protected signed field: '||field) from (values
('document_snapshot','document_snapshot=''{}''::jsonb'),('document_template_version','document_template_version=''legacy'''),('final_file_id','final_file_id=null'),('finalization_started_at','finalization_started_at=null'),('finalized_at','finalized_at=null'),('signed_at','signed_at=null'),('legal_acceptance','legal_acceptance=''{}''::jsonb'),('finalization_content_sha256','finalization_content_sha256=''changed''')) x(field,assignment);
select throws_ok(format('update public.consent_files set %s where id=%L',assignment,'62000000-0000-4000-8001-000000000023'),'23514','A signed consent final file is immutable','protected signed final-file field: '||field) from (values
('id','id=''62000000-0000-4000-8001-000000000099'''),('consent_id','consent_id=''62000000-0000-4000-8000-000000000026'''),('studio_id','studio_id=''62000000-0000-4000-8000-000000000099'''),('artist_id','artist_id=''62000000-0000-4000-8000-000000000099'''),('bucket_id','bucket_id=''changed'''),('storage_path','storage_path=''changed'''),('file_name','file_name=''changed.pdf'''),('mime_type','mime_type=''text/plain'''),('size_bytes','size_bytes=999'),('sha256','sha256=''changed'''),('document_kind','document_kind=''client_evidence'''),('created_at','created_at=clock_timestamp()')) x(field,assignment);
select lives_ok($$update public.consent_files set drive_file_id='synthetic-drive',drive_view_link='https://invalid.example/synthetic',drive_copy_claimed_at=clock_timestamp(),drive_copy_completed_at=clock_timestamp() where id='62000000-0000-4000-8001-000000000023'$$,'legitimate signed Drive reconciliation remains allowed');
select throws_ok($$delete from public.consents where id='62000000-0000-4000-8000-000000000023'$$,'23514','A signed consent cannot be deleted','signed consent direct deletion is rejected');
select throws_ok($$delete from public.consent_files where id='62000000-0000-4000-8001-000000000023'$$,'23514','A signed consent final file cannot be deleted','signed final-file direct deletion is rejected');
select is((select confdeltype::text from pg_constraint where conrelid='public.consent_files'::regclass and conname='consent_files_consent_id_fkey'),'r','final files no longer cascade from consent deletion');
select is(array(select n.nspname||'.'||p.relname from pg_constraint fk join pg_class p on p.oid=fk.confrelid join pg_namespace n on n.oid=p.relnamespace where fk.conrelid='public.consent_files'::regclass and fk.contype='f' and fk.confdeltype='c' order by 1),array['public.studios'],'remaining consent-file cascade-parent inventory is exact');
select throws_ok($$delete from public.studios where id='62000000-0000-4000-8000-000000000001'$$,'23503',null,'signed studio parent cannot cascade final files');
insert into auth.users(id,email) values('62000000-0000-4000-8002-000000000001','synthetic-a2b@example.invalid');
insert into public.profiles(id,user_id,studio_id,role,full_name) values('62000000-0000-4000-8002-000000000002','62000000-0000-4000-8002-000000000001','62000000-0000-4000-8000-000000000001','owner','SYNTHETIC A2B OWNER');
insert into storage.objects(bucket_id,name,metadata) values('consent-pdfs','studios/62000000-0000-4000-8000-000000000001/final-23.pdf','{"synthetic":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-4000-8002-000000000001',true);
select throws_ok($$update storage.objects set metadata='{"changed":true}' where bucket_id='consent-pdfs' and name='studios/62000000-0000-4000-8000-000000000001/final-23.pdf'$$,'23514','A signed consent Storage object is immutable','browser Storage update is rejected');
select throws_ok($$insert into storage.objects(bucket_id,name,metadata) values('consent-pdfs','studios/62000000-0000-4000-8000-000000000001/final-23.pdf','{"upsert":true}') on conflict(bucket_id,name) do update set metadata=excluded.metadata$$,'23514','A signed consent Storage object is immutable','browser Storage upsert is rejected');
select throws_ok($$delete from storage.objects where bucket_id='consent-pdfs' and name='studios/62000000-0000-4000-8000-000000000001/final-23.pdf'$$,'42501','Direct deletion from storage tables is not allowed. Use the Storage API instead.','browser direct Storage delete is rejected');
reset role;
select is((select document_template_version||':'||final_file_id::text from public.consents where id='62000000-0000-4000-8000-000000000023'),'consent-v4-registration-only:62000000-0000-4000-8001-000000000023','signed consent history remains unchanged');
select is((select bucket_id||':'||storage_path||':'||sha256||':'||size_bytes from public.consent_files where id='62000000-0000-4000-8001-000000000023'),'consent-pdfs:studios/62000000-0000-4000-8000-000000000001/final-23.pdf:synthetic-23:23','signed file history remains unchanged');
select is((select metadata from storage.objects where bucket_id='consent-pdfs' and name='studios/62000000-0000-4000-8000-000000000001/final-23.pdf'),' {"synthetic": true}'::jsonb,'signed Storage history remains unchanged');
select is((select proowner::regrole::text from pg_proc where oid='private.protect_signed_consent_file()'::regprocedure),'postgres','reverse guard helper owner is postgres');
select is((select proconfig from pg_proc where oid='private.protect_signed_consent_file()'::regprocedure),array['search_path=""'],'reverse guard helper has empty search_path');
select ok(not has_function_privilege('service_role','private.protect_signed_consent_file()','execute'),'service_role cannot directly execute reverse helper');
select ok(not has_function_privilege('authenticated','private.protect_signed_consent_file()','execute'),'authenticated cannot directly execute reverse helper');
select is((select proowner::regrole::text from pg_proc where oid='private.protect_signed_consent_storage()'::regprocedure),'postgres','Storage guard helper owner is postgres');
select is((select proconfig from pg_proc where oid='private.protect_signed_consent_storage()'::regprocedure),array['search_path=""'],'Storage guard helper has empty search_path');
select ok(not has_function_privilege('service_role','private.protect_signed_consent_storage()','execute'),'service_role cannot directly execute Storage helper');
select ok(not has_function_privilege('authenticated','private.protect_signed_consent_storage()','execute'),'authenticated cannot directly execute Storage helper');
select is((select tgtype::int from pg_trigger where tgrelid='storage.objects'::regclass and tgname='protect_signed_consent_storage'),27,'Storage API guard covers row-level before update and delete');
select * from finish();
rollback;
