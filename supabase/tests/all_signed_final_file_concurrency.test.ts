import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

const enabled = process.env.RUN_SUPABASE_CONCURRENCY === '1'
const repo = resolve(process.cwd())
const cli = join(repo, 'node_modules/supabase/dist/supabase.js')
const migration = '20260812122407_registration_attestation_compatibility.sql'
const excluded = 'gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'
const lockRoot = join(tmpdir(), '.integration-serialization.lock')
const receiptPath = join(tmpdir(), '.integration-serialization.receipt.json')
type Sql = { text: string; values?: unknown[] }
type Pending = { promise: Promise<unknown>; settled: () => boolean }
type Lock = { token: string }
type State = { ids?: string[]; pending?: Pending; pids?: number[] }
type Receipt = { baseline: string[]; projects: { id: string; root: string }[]; observed: string[] }
class HarnessError extends Error {}
let projectsCreated = 0
const fail = (label: string): never => { throw new HarnessError(label) }
const delay = (ms: number) => new Promise(resolveDelay => setTimeout(resolveDelay, ms))

async function bounded<T>(promise: Promise<T>, label: string, ms = 5000) {
  let timer: ReturnType<typeof setTimeout>
  return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HarnessError(label)), ms) })]).finally(() => clearTimeout(timer!))
}
async function terminateTree(child: ReturnType<typeof spawn>) {
  if (!child.pid) return
  if (process.platform === 'win32') await new Promise<void>(resolveKill => {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    killer.once('error', () => resolveKill()); killer.once('close', () => resolveKill())
  })
  else {
    try { process.kill(-child.pid, 'SIGTERM') } catch { /* already closed */ }
    await delay(750)
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* already closed */ }
  }
}
async function run(exe: string, args: string[], label: string, cwd = repo, timeout = 180_000) {
  return await new Promise<string>((resolveRun, reject) => {
    const child = spawn(exe, args, { cwd, windowsHide: true, detached: process.platform !== 'win32' })
    let stdout = ''; let stderr = ''; let timedOut = false; let launched = true
    const capture = (target: 'out' | 'err') => (chunk: Buffer) => {
      const remaining = 1_000_000 - stdout.length - stderr.length
      if (remaining > 0) target === 'out' ? stdout += chunk.toString().slice(0, remaining) : stderr += chunk.toString().slice(0, remaining)
    }
    child.stdout?.on('data', capture('out')); child.stderr?.on('data', capture('err'))
    let termination: Promise<void> | undefined
    const timer = setTimeout(() => { timedOut = true; termination = terminateTree(child) }, timeout)
    child.once('error', () => { launched = false; clearTimeout(timer); reject(new HarnessError(`${label}-launch-failed`)) })
    child.once('close', async code => {
      clearTimeout(timer); if (!launched) return
      if (termination) await termination
      if (timedOut) return reject(new HarnessError(`${label}-timeout`))
      if (code === 0) return resolveRun(stdout)
      const clean = (stdout + stderr).replace(/\x1b\[[0-9;]*m/g, '')
      const assertion = label.endsWith('pgtap-failed') ? clean.match(/(?:not ok|Failed test)\s+(\d+)/i)?.[1] : undefined
      reject(new HarnessError(assertion ? `${label}-assertion-${assertion}` : label))
    })
  })
}
const cliRun = (root: string, args: string[], label: string) => run(process.execPath, [cli, '--workdir', root, ...args], label, root)
const docker = (args: string[], label: string) => run('docker', args, label)
async function resources(id?: string) {
  const filter = id ? ['--filter', `label=com.supabase.cli.project=${id}`] : []
  const [containers, volumes, networks] = await Promise.all([
    docker(['ps', '-aq', ...filter], 'resource-inspection-failed'), docker(['volume', 'ls', '-q', ...filter], 'resource-inspection-failed'), docker(['network', 'ls', '-q', ...filter], 'resource-inspection-failed'),
  ])
  const set = (value: string) => new Set(value.split(/\s+/).filter(Boolean))
  return { containers: set(containers), volumes: set(volumes), networks: set(networks) }
}
const empty = (r: Awaited<ReturnType<typeof resources>>) => !r.containers.size && !r.volumes.size && !r.networks.size
async function removeOwned(id: string) {
  let owned = await resources(id)
  if (owned.containers.size) await docker(['rm', '-f', ...owned.containers], 'owned-container-cleanup-failed')
  if (owned.networks.size) await docker(['network', 'rm', ...owned.networks], 'owned-network-cleanup-failed')
  if (owned.volumes.size) await docker(['volume', 'rm', ...owned.volumes], 'owned-volume-cleanup-failed')
  owned = await resources(id); if (!empty(owned)) fail('owned-resource-cleanup-failed')
}
function persistReceipt(receipt: Receipt) { writeFileSync(receiptPath, JSON.stringify(receipt)) }
async function removeRunVolumes(baseline: Set<string>, receipt: Receipt) {
  const deadline = Date.now() + 10_000; let absentSince = 0
  while (Date.now() < deadline) {
    const current = await resources(); const added = [...current.volumes].filter(name => !baseline.has(name))
    if (added.length) {
      absentSince = 0; receipt.observed = [...new Set([...receipt.observed, ...added])]; persistReceipt(receipt)
      await docker(['volume', 'rm', ...added], 'owned-volume-cleanup-failed').catch(() => undefined)
    } else { absentSince ||= Date.now(); if (Date.now() - absentSince >= 1000) return }
    await delay(100)
  }
  const current = await resources(); if ([...current.volumes].some(name => !baseline.has(name))) fail('owned-volume-cleanup-failed')
}
function alive(pid: number) { try { process.kill(pid, 0); return true } catch { return false } }
function readOwner(): (Lock & { pid: number; time: number }) | undefined {
  try { const value = JSON.parse(readFileSync(join(lockRoot, 'owner.json'), 'utf8')); return typeof value.pid === 'number' && typeof value.token === 'string' && typeof value.time === 'number' ? value : undefined } catch { return undefined }
}
async function acquireLock(): Promise<Lock> {
  const deadline = Date.now() + 180_000; const token = randomUUID()
  while (Date.now() < deadline) {
    try { mkdirSync(lockRoot); const lock = { pid: process.pid, token, time: Date.now() }; writeFileSync(join(lockRoot, 'owner.json'), JSON.stringify(lock)); return lock }
    catch {
      const owner = readOwner(); if (owner && alive(owner.pid)) { await delay(100); continue }
      let stale = false; try { stale = Date.now() - statSync(lockRoot).mtimeMs > 10_000 } catch { /* retry */ }
      if (!stale) { await delay(100); continue }
      const current = readOwner(); if (current && (alive(current.pid) || current.token !== owner?.token)) { await delay(100); continue }
      try { rmSync(lockRoot, { recursive: true }) } catch { await delay(100) }
    }
  }
  return fail('process-lock-timeout')
}
function updateLock(lock: Lock) {
  const owner = readOwner(); if (!owner || owner.token !== lock.token) fail('process-lock-ownership-lost')
  writeFileSync(join(lockRoot, 'owner.json'), JSON.stringify({ pid: process.pid, token: lock.token, time: Date.now() }))
}
function releaseLock(lock: Lock) {
  const owner = readOwner(); if (!owner || owner.token !== lock.token) fail('process-lock-release-failed')
  try { rmSync(lockRoot, { recursive: true }) } catch { fail('process-lock-release-failed') }
}
function provenance() {
  const version = (name: string) => JSON.parse(readFileSync(join(repo, `node_modules/${name}/package.json`), 'utf8')).version
  if (version('supabase') !== '2.113.0' || version('pg') !== '8.16.3' || !existsSync(cli)) fail('dependency-provenance-failed')
  const sql = readFileSync(join(repo, 'supabase/migrations', migration), 'utf8').split(/\r?\n/).slice(0, 2).join('\n'); if (sql !== 'lock table public.consent_files in share row exclusive mode;\nlock table public.consents in share row exclusive mode;') fail('migration-lock-order-failed')
}
function makeProject(): { root: string; id: string } {
  let root: string
  try {
    root = mkdtempSync(join(tmpdir(), 'consent-lock-')); mkdirSync(join(root, 'supabase'), { recursive: true })
    cpSync(join(repo, 'supabase/config.toml'), join(root, 'supabase/config.toml')); cpSync(join(repo, 'supabase/migrations'), join(root, 'supabase/migrations'), { recursive: true })
    rmSync(join(root, 'supabase/migrations', migration))
    cpSync(join(repo, 'supabase/tests'), join(root, 'supabase/tests'), { recursive: true })
    const config = join(root, 'supabase/config.toml'); const original = readFileSync(config, 'utf8'); const id = `lock-${randomUUID().replaceAll('-', '')}`
    const changed = original.replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${id}"`)
    if (changed === original || (changed.match(/^project_id\s*=/gm)?.length ?? 0) !== 1) fail('project-configuration-failed')
    writeFileSync(config, changed); projectsCreated += 1; return { root, id }
  } catch { fail('project-creation-failed') }
}
async function databaseTarget(root: string) {
  let parsed: unknown; try { parsed = JSON.parse(await cliRun(root, ['status', '--output', 'json'], 'status-failed')) } catch (error) { if (error instanceof HarnessError) throw error; fail('status-schema-failed') }
  const key = ['DB', ['U', 'R', 'L'].join('')].join('_'); const value = (parsed as Record<string, unknown>)[key]
  if (typeof value !== 'string' || !value) return fail('status-contract-failed'); return value
}
function pending(client: Client, sql: Sql): Pending { let done = false; const promise = client.query(sql).finally(() => { done = true }); promise.catch(() => undefined); return { promise, settled: () => done } }
async function waitForLock(observer: Client, writerPid: number, lockerPid: number) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const row = (await observer.query(`select a.wait_event_type,pg_blocking_pids(a.pid) blockers,exists(select from pg_locks l where l.pid=a.pid and not l.granted) ungranted from pg_stat_activity a where a.pid=$1`, [writerPid])).rows[0]
    if (row?.wait_event_type === 'Lock' && row.ungranted && row.blockers.map(Number).includes(lockerPid)) return
    await delay(25)
  }
  fail('lock-observation-failed')
}
async function settle(state: State, writer: Client, observer?: Client) {
  const item = state.pending; if (!item) return
  if (!item.settled()) try { await bounded(item.promise, 'pending-settlement-timeout') } catch { if (state.pids?.[1] && observer) await bounded(observer.query('select pg_terminate_backend($1)', [state.pids[1]]), 'writer-termination-timeout').catch(() => undefined); await bounded(item.promise.catch(() => undefined), 'pending-termination-timeout') }
  state.pending = undefined
}
async function expect23514(state: State) {
  const item = state.pending!; try { await bounded(item.promise, 'constraint-timeout'); fail('constraint-rejection-missing') } catch (error) { if (error instanceof HarnessError) throw error; if ((error as { code?: string }).code !== '23514') fail('constraint-state-mismatch') } finally { state.pending = undefined }
}
async function safe(action: () => Promise<unknown>, errors: string[], label: string) { try { await action() } catch { errors.push(label) } }
async function closeClient(client: Client) {
  try { await bounded(client.end(), 'client-close-timeout') } catch { (client as unknown as { connection?: { stream?: { destroy(): void } } }).connection?.stream?.destroy(); await bounded(client.end().catch(() => undefined), 'client-close-timeout') }
}
async function fixture(client: Client, ids: string[], token: string) {
  await client.query('insert into public.studios(id,slug,legal_name,trade_name) values($1,$2,$3,$3)', [ids[0], `fixture-${token}`, 'SYNTHETIC LOCK STUDIO'])
  await client.query('insert into public.artists(id,studio_id,full_name,dni,qualification) values($1,$2,$3,$4,$5)', [ids[1], ids[0], 'SYNTHETIC LOCK ARTIST', `SYNTHETIC-${token}`, 'SYNTHETIC'])
  await client.query('insert into auth.users(id,email) values($1,$2)', [ids[8], `fixture-${token}@example.invalid`]); await client.query("insert into public.profiles(id,user_id,studio_id,role,full_name) values($1,$2,$3,'owner','SYNTHETIC LOCK OWNER')", [ids[9], ids[8], ids[0]])
  const consent = `insert into public.consents(id,studio_id,artist_id,client_full_name,client_dni,idempotency_key,is_minor,has_legal_representative,status,document_template_version) values($1,$2,$3,$4,$5,$6,false,false,'pending_artist','consent-v4-registration-only')`
  await client.query(consent, [ids[2], ids[0], ids[1], 'SYNTHETIC LOCK CLIENT', `SYNTHETIC-${token}`, `fixture-${token}`]); await client.query(consent, [ids[5], ids[0], ids[1], 'SYNTHETIC DELETE CLIENT', `SYNTHETIC-DELETE-${token}`, `fixture-delete-${token}`]); await client.query(consent, [ids[6], ids[0], ids[1], 'SYNTHETIC RACE CLIENT', `SYNTHETIC-RACE-${token}`, `fixture-race-${token}`])
  await client.query(`insert into public.consent_files(id,consent_id,studio_id,artist_id,storage_path,file_name,document_kind,sha256,size_bytes) values($1,$2,$3,$4,$5,'final.pdf','final',$6,1),($7,$2,$3,$4,$8,'other.pdf','client_evidence',$9,1),($10,$11,$3,$4,$12,'race.pdf','final',$13,1)`, [ids[3], ids[2], ids[0], ids[1], `fixture-${token}/final`, `fixture-${token}`, ids[4], `fixture-${token}/other`, `fixture-${token}-other`, ids[7], ids[6], `fixture-${token}/race`, `fixture-${token}-race`]); await client.query('update public.consents set final_file_id=$1 where id=$2', [ids[3], ids[2]])
}
async function proveMigrationRollback(root: string, client: Client) {
  const ids = Array.from({ length: 10 }, () => randomUUID()); await fixture(client, ids, randomUUID().slice(0, 8)); const [studio, artist, consent, , , spare, , , user] = ids; const unknown = projectsCreated === 1
  if (unknown) await client.query("update public.consents set status='signed',document_template_version='consent-v5-unsupported' where id=$1", [consent]); else await client.query("update public.consents set status='signed' where id=$1", [spare])
  cpSync(join(repo, 'supabase/migrations', migration), join(root, 'supabase/migrations', migration))
  try { await cliRun(root, ['migration', 'up', '--local', '--yes'], 'migration-preflight-failed'); fail('migration-preflight-accepted') } catch (error) { if (!(error instanceof HarnessError) || error.message !== 'migration-preflight-failed') throw error }
  const ledger = Number((await client.query('select count(*) n from supabase_migrations.schema_migrations where version=$1', ['20260812122407'])).rows[0].n); const row = (await client.query('select status,document_template_version,final_file_id from public.consents where id=$1', [unknown ? consent : spare])).rows[0]
  if (ledger || (await client.query("select to_regprocedure('private.assert_all_signed_consent_history_supported()') is not null installed")).rows[0].installed || row.status !== 'signed' || (unknown ? row.document_template_version !== 'consent-v5-unsupported' || !row.final_file_id : row.final_file_id !== null)) fail('migration-rollback-failed')
  await client.query('alter table public.consents disable trigger consents_protect_signed_document'); await client.query("update public.consents set status='pending_artist',document_template_version='consent-v4-registration-only' where id=$1", [unknown ? consent : spare]); await client.query('alter table public.consents enable trigger consents_protect_signed_document')
  await client.query('delete from public.consents where studio_id=$1', [studio]); await client.query('delete from public.consent_files where studio_id=$1', [studio]); await client.query('delete from public.artists where id=$1', [artist]); await client.query('delete from public.studios where id=$1', [studio]); await client.query('delete from auth.users where id=$1', [user])
  await cliRun(root, ['migration', 'up', '--local', '--yes'], 'migration-up-failed'); if (Number((await client.query('select count(*) n from supabase_migrations.schema_migrations where version=$1', ['20260812122407'])).rows[0].n) !== 1) fail('migration-ledger-failed')
}
async function tableWait(locker: Client, writer: Client, observer: Client, state: State, sql: Sql) {
  await locker.query('begin'); await locker.query('lock table public.consent_files in share row exclusive mode'); await locker.query('lock table public.consents in share row exclusive mode'); state.pending = pending(writer, sql)
  try { await waitForLock(observer, state.pids![1], state.pids![0]); await locker.query('rollback'); await bounded(state.pending.promise, 'writer-settlement-timeout'); state.pending = undefined } finally { await safe(() => locker.query('rollback'), [], 'ignored'); await settle(state, writer, observer) }
}
async function exercise(clients: Client[], state: State) {
  const [locker, writer, observer] = clients; state.pids = await Promise.all(clients.map(async client => Number((await client.query('select pg_backend_pid() pid')).rows[0].pid))); if (new Set(state.pids).size !== 3) fail('backend-identity-failed')
  state.ids = Array.from({ length: 10 }, () => randomUUID()); await fixture(observer, state.ids, randomUUID().slice(0, 8)); const [studio, artist, consent, finalFile, otherFile, spareConsent, raceConsent, raceFile, , profile] = state.ids
  const cases: Sql[] = [
    { text: "insert into public.consent_files(id,consent_id,studio_id,artist_id,storage_path,file_name,document_kind) values($1,$2,$3,$4,$5,'insert.pdf','client_evidence')", values: [randomUUID(), consent, studio, artist, `fixture-${randomUUID()}`] }, { text: 'update public.consent_files set size_bytes=size_bytes+1 where id=$1', values: [otherFile] }, { text: 'delete from public.consent_files where id=$1', values: [otherFile] },
    { text: "insert into public.consents(id,studio_id,artist_id,client_full_name,client_dni,idempotency_key,is_minor,has_legal_representative,status) values($1,$2,$3,'SYNTHETIC LOCK CLIENT',$4,$5,false,false,'pending_artist')", values: [randomUUID(), studio, artist, `SYNTHETIC-${randomUUID()}`, `fixture-${randomUUID()}`] }, { text: "update public.consents set client_full_name='SYNTHETIC CHANGED' where id=$1", values: [consent] }, { text: 'delete from public.consents where id=$1', values: [spareConsent] },
  ]
  for (const sql of cases) await tableWait(locker, writer, observer, state, sql)
  await locker.query('begin'); await locker.query("update public.consent_files set document_kind='client_evidence' where id=$1", [finalFile]); state.pending = pending(writer, { text: "update public.consents set status='signed' where id=$1", values: [consent] }); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); await expect23514(state)
  await observer.query("update public.consent_files set document_kind='final' where id=$1", [finalFile]); await locker.query('begin'); await locker.query("update public.consents set status='signed' where id=$1", [consent]); state.pending = pending(writer, { text: "update public.consent_files set document_kind='client_evidence' where id=$1", values: [finalFile] }); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); await expect23514(state)
  await locker.query('begin'); await locker.query('delete from public.consent_files where id=$1', [raceFile]); state.pending = pending(writer, { text: "update public.consents set final_file_id=$1,status='signed' where id=$2", values: [raceFile, raceConsent] }); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); await expect23514(state)
  await observer.query(`insert into public.consent_files(id,consent_id,studio_id,artist_id,storage_path,file_name,document_kind,sha256,size_bytes) values($1,$2,$3,$4,$5,'race.pdf','final',$6,1)`, [raceFile, raceConsent, studio, artist, `fixture-${randomUUID()}/race`, `fixture-${randomUUID()}`]); await locker.query('begin'); await locker.query("update public.consents set final_file_id=$1,status='signed' where id=$2", [raceFile, raceConsent]); state.pending = pending(writer, { text: 'delete from public.consent_files where id=$1', values: [raceFile] }); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); await expect23514(state)
  await observer.query('update private.registration_attestation_contract_state set enabled=true where singleton'); const settings = (registration: string, attest: boolean): Sql => ({ text: 'select outcome_code from public.update_studio_settings_as_manager_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', values: [profile, studio, 'SYNTHETIC LEGAL', 'SYNTHETIC TRADE', 'SYNTH-TAX', 'SYNTH ADDRESS', 'SYNTH CITY', '00000', '000000', registration, attest, 'registration-only-v2'] })
  await observer.query(settings('RG-CONCURRENT-A', false)); await observer.query(settings('RG-CONCURRENT-A', true)); await locker.query('begin'); await locker.query(settings('RG-CONCURRENT-B', false)); state.pending = pending(writer, settings('RG-CONCURRENT-B', true)); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); const attested = await bounded(state.pending.promise, 'settings-attest-timeout') as { rows: { outcome_code: string }[] }; state.pending = undefined; if (attested.rows[0]?.outcome_code !== 'REGISTRATION_ATTESTED') fail('settings-attest-outcome-failed')
  await locker.query('begin'); await locker.query(settings('RG-CONCURRENT-B', true)); state.pending = pending(writer, settings('RG-CONCURRENT-C', false)); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); const changed = await bounded(state.pending.promise, 'settings-change-timeout') as { rows: { outcome_code: string }[] }; state.pending = undefined; if (changed.rows[0]?.outcome_code !== 'REGISTRATION_CHANGED_REATTEST_REQUIRED' || !(await observer.query('select health_data_verified_at is null invalidated from public.studios where id=$1', [studio])).rows[0].invalidated) fail('settings-change-outcome-failed')
  const readiness: Sql = { text: 'select outcome_code from public.get_studio_finalization_context_v2($1,$2,$3)', values: [profile, studio, 'registration-only-v2'] }
  await locker.query('begin'); await locker.query(settings('RG-CONCURRENT-D', false)); state.pending = pending(writer, readiness); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); let result = await bounded(state.pending.promise, 'readiness-change-timeout') as { rows: { outcome_code: string }[] }; state.pending = undefined; if (result.rows[0]?.outcome_code !== 'REGISTRATION_UNATTESTED') fail('readiness-change-outcome-failed')
  await observer.query(settings('RG-CONCURRENT-D', true)); await locker.query('begin'); await locker.query(settings('RG-CONCURRENT-D', true)); state.pending = pending(writer, readiness); await waitForLock(observer, state.pids[1], state.pids[0]); await locker.query('commit'); result = await bounded(state.pending.promise, 'readiness-attest-timeout') as { rows: { outcome_code: string }[] }; state.pending = undefined; if (result.rows[0]?.outcome_code !== 'READY') fail('readiness-attest-outcome-failed')
}
async function projectRun(lock: Lock, baseline: Awaited<ReturnType<typeof resources>>, receipt: Receipt) {
  const project = makeProject(); receipt.projects.push(project); persistReceipt(receipt); updateLock(lock); const errors: string[] = []; const clients: Client[] = []; const state: State = {}; let ready = 0; let cleanupConfirmed = false
  try {
    if (!empty(await resources(project.id))) fail('startup-project-not-clean')
    await cliRun(project.root, ['start', '--exclude', excluded], 'stack-start-failed'); await cliRun(project.root, ['db', 'reset', '--local', '--no-seed', '--yes'], 'database-reset-failed')
    await cliRun(project.root, ['status', '--help'], 'status-help-failed'); const target = await databaseTarget(project.root)
    for (const applicationName of ['locker', 'writer', 'observer']) { const client = new Client(target); clients.push(client); await bounded(client.connect(), 'client-connect-timeout'); ready += 1; await client.query("select set_config('application_name',$1,false),set_config('statement_timeout','6000',false)", [applicationName]) }
    await proveMigrationRollback(project.root, clients[2])
    await clients[2].query("select pg_advisory_lock(hashtext('all-signed-final-file'))")
    const held = Number((await clients[2].query("select count(*) n from pg_locks where locktype='advisory' and pid=$1 and granted", [Number((await clients[2].query('select pg_backend_pid() pid')).rows[0].pid)])).rows[0].n); if (!held) fail('database-serialization-failed')
    await cliRun(project.root, ['test', 'db', '--local', 'supabase/tests/all_signed_final_file_test.sql'], 'focused-pgtap-failed')
    await cliRun(project.root, ['test', 'db', '--local', 'supabase/tests/studio_settings_v2_rpc_test.sql'], 'settings-pgtap-failed')
    await cliRun(project.root, ['test', 'db', '--local', 'supabase/tests/studio_finalization_context_v2_test.sql'], 'readiness-pgtap-failed')
    await exercise(clients, state)
    if (process.env.GENERATE_SUPABASE_TYPES === '1' && projectsCreated === 2) {
      const generated = await cliRun(project.root, ['gen', 'types', 'typescript', '--local', '--schema', 'public'], 'type-generation-failed')
      if (!generated.includes('export type Json') || !generated.includes('get_studio_finalization_context_v2') || !generated.includes('update_studio_settings_as_manager_v2')) fail('generated-type-contract-failed')
      const target = join(repo, 'src/types/supabase.ts'); const temporary = `${target}.generated`
      writeFileSync(temporary, `${generated.trimEnd()}\n`); renameSync(temporary, target)
    }
  } catch (error) { errors.push(error instanceof HarnessError ? error.message : 'database-operation-failed') }
  finally {
    if (ready > 0) await safe(() => clients[0].query('rollback'), errors, 'locker-rollback-failed'); if (ready > 1) await settle(state, clients[1], ready > 2 ? clients[2] : undefined); if (ready > 1) await safe(() => clients[1].query('rollback'), errors, 'writer-rollback-failed')
    if (state.ids && ready > 2) { const [studio, artist, , , , , , , user] = state.ids; await safe(async () => { await clients[2].query('begin'); try { await clients[2].query('set local session_replication_role=replica'); await clients[2].query('delete from public.consents where studio_id=$1', [studio]); await clients[2].query('delete from public.consent_files where studio_id=$1', [studio]); await clients[2].query('delete from public.artists where id=$1', [artist]); await clients[2].query('delete from public.studios where id=$1', [studio]); await clients[2].query('delete from auth.users where id=$1', [user]); await clients[2].query('commit') } catch (error) { await clients[2].query('rollback').catch(() => undefined); throw error } }, errors, 'fixture-cleanup-failed'); await safe(async () => { const n = Number((await clients[2].query('select (select count(*) from public.studios where id=$1)+(select count(*) from public.artists where id=$2)+(select count(*) from public.consents where studio_id=$1)+(select count(*) from public.consent_files where studio_id=$1)+(select count(*) from auth.users where id=$3) n', [studio, artist, user])).rows[0].n); if (n) fail('fixture-absence-failed') }, errors, 'fixture-absence-failed') }
    if (ready > 2) await safe(() => clients[2].query("select pg_advisory_unlock(hashtext('all-signed-final-file'))"), errors, 'advisory-unlock-failed'); for (const client of clients) await safe(() => closeClient(client), errors, 'client-close-failed')
    await safe(() => cliRun(project.root, ['stop', '--project-id', project.id, '--no-backup'], 'stack-cleanup-failed'), errors, 'stack-cleanup-failed')
    await safe(() => removeOwned(project.id), errors, 'owned-resource-cleanup-failed'); await safe(() => removeRunVolumes(baseline.volumes, receipt), errors, 'owned-volume-cleanup-failed')
    try { cleanupConfirmed = same(baseline, await resources()) } catch { errors.push('resource-verification-failed') }
    if (cleanupConfirmed) try { rmSync(project.root, { recursive: true }); if (existsSync(project.root)) fail('workdir-cleanup-failed') } catch { errors.push('workdir-cleanup-failed') }
    if (cleanupConfirmed) updateLock(lock)
  }
  if (errors.length) fail([...new Set(errors)].join(',')); return project.id
}
function same(a: Awaited<ReturnType<typeof resources>>, b: Awaited<ReturnType<typeof resources>>) { return (['containers', 'volumes', 'networks'] as const).every(k => a[k].size === b[k].size && [...a[k]].every(value => b[k].has(value))) }

describe.skipIf(!enabled)('all-signed final-file concurrency', () => {
  it('proves real lock waits and fail-closed interleavings in two disposable projects', async () => {
    provenance(); projectsCreated = 0; const lock = await acquireLock(); let baseline: Awaited<ReturnType<typeof resources>> | undefined
    try { baseline = await resources(); const receipt: Receipt = { baseline: [...baseline.volumes], projects: [], observed: [] }; persistReceipt(receipt); const first = await projectRun(lock, baseline, receipt); const second = await projectRun(lock, baseline, receipt); expect(first).not.toBe(second); expect(projectsCreated).toBe(2); if (!same(baseline, await resources())) fail('resource-baseline-mismatch') } finally { try { if (baseline && same(baseline, await resources())) rmSync(receiptPath, { force: true }) } finally { releaseLock(lock) } }
  }, 1_200_000)
})
