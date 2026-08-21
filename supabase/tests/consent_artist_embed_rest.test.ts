import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readArtistFkContract } from './support/artistFkContract';

const restUrl = process.env.SUPABASE_URL ?? process.env.API_URL;
const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DB_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const missing = [!restUrl && 'SUPABASE_URL', !dbUrl && 'SUPABASE_DB_URL', !anonKey && 'SUPABASE_ANON_KEY', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);

if (missing.length) throw new Error(`local-rest-gate-config-missing:${missing.join(',')}`);
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(restUrl!)) {
  throw new Error('local-rest-gate-refuses-non-loopback-url');
}
if (!/^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\//.test(dbUrl!)) throw new Error('local-rest-gate-refuses-non-loopback-db');

const token = randomUUID();
const ids = {
  studioA: randomUUID(),
  studioB: randomUUID(),
  artistA: randomUUID(),
  artistB: randomUUID(),
  consentA: randomUUID(),
  consentB: randomUUID(),
};
let userId: string | undefined;
let userAccessToken = '';
let dbConnected = false;
const db = new Client({ connectionString: dbUrl });

function headers(bearer: string, prefer?: string) {
  return {
    apikey: bearer === serviceKey ? serviceKey! : anonKey!,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

beforeAll(async () => {
  await db.connect();
  dbConnected = true;
  await db.query(`insert into public.studios(id,slug,legal_name,trade_name) values($1,$2,'SYNTHETIC STUDIO A','SYNTHETIC STUDIO A'),($3,$4,'SYNTHETIC STUDIO B','SYNTHETIC STUDIO B')`, [ids.studioA, `rest-a-${token}`, ids.studioB, `rest-b-${token}`]);
  await db.query(`insert into public.artists(id,studio_id,full_name,dni,qualification) values($1,$2,'SYNTHETIC ARTIST A',$3,'SYNTHETIC'),($4,$5,'SYNTHETIC ARTIST B',$6,'SYNTHETIC')`, [ids.artistA, ids.studioA, `A-${token}`, ids.artistB, ids.studioB, `B-${token}`]);
  await db.query(`insert into public.consents(id,studio_id,artist_id,client_full_name,client_dni,idempotency_key,is_minor,has_legal_representative) values($1,$2,$3,'SYNTHETIC CLIENT A',$4,$5,false,false),($6,$7,$8,'SYNTHETIC CLIENT B',$9,$10,false,false)`, [ids.consentA, ids.studioA, ids.artistA, `CA-${token}`, `rest-a-${token}`, ids.consentB, ids.studioB, ids.artistB, `CB-${token}`, `rest-b-${token}`]);

  const email = `rest-${token}@example.invalid`;
  const password = `Synthetic-${token}!`;
  const created = await fetch(`${restUrl}/auth/v1/admin/users`, {
    method: 'POST', headers: headers(serviceKey!), body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) throw new Error(`fixture-user-failed:${created.status}`);
  userId = ((await created.json()) as { id: string }).id;
  await db.query(`insert into public.profiles(user_id,studio_id,role,full_name) values($1,$2,'owner','SYNTHETIC OWNER')`, [userId, ids.studioA]);

  const signedIn = await fetch(`${restUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anonKey!, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  if (!signedIn.ok) throw new Error(`fixture-sign-in-failed:${signedIn.status}`);
  userAccessToken = ((await signedIn.json()) as { access_token: string }).access_token;
}, 30_000);

afterAll(async () => {
  if (!dbConnected) return;
  await db.query('delete from public.consents where id = any($1::uuid[])', [[ids.consentA, ids.consentB]]);
  await db.query('delete from public.artists where id = any($1::uuid[])', [[ids.artistA, ids.artistB]]);
  if (userId) await db.query('delete from public.profiles where user_id=$1', [userId]);
  await db.query('delete from public.studios where id = any($1::uuid[])', [[ids.studioA, ids.studioB]]);
  if (userId) {
    const deleted = await fetch(`${restUrl}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: headers(serviceKey!) });
    if (!deleted.ok) throw new Error(`fixture-user-cleanup-failed:${deleted.status}`);
  }
  const remaining = await db.query('select (select count(*) from public.consents where id = any($1::uuid[])) + (select count(*) from public.artists where id = any($2::uuid[])) + (select count(*) from public.studios where id = any($3::uuid[])) as count', [[ids.consentA, ids.consentB], [ids.artistA, ids.artistB], [ids.studioA, ids.studioB]]);
  if (Number(remaining.rows[0].count) !== 0) throw new Error('fixture-cleanup-unconfirmed');
  await db.end();
  dbConnected = false;
});

describe('mandatory consent artist PostgREST gate', () => {
  it('has exactly the expected simple and composite artist relationships', async () => {
    expect(await readArtistFkContract(db)).toEqual([
      { name: 'consents_artist_id_fkey', columns: ['artist_id'], referencedColumns: ['id'] },
      { name: 'consents_artist_studio_fkey', columns: ['artist_id', 'studio_id'], referencedColumns: ['id', 'studio_id'] },
    ]);
  });

  it('rejects the ambiguous embed when both foreign keys exist', async () => {
    const response = await fetch(`${restUrl}/rest/v1/consents?select=*,artists(full_name)&studio_id=eq.${ids.studioA}`, {
      headers: headers(userAccessToken),
    });
    expect(response.ok).toBe(false);
    expect(await response.json()).toMatchObject({ code: 'PGRST201' });
  });

  it('uses the composite embed and returns only the authorized studio row', async () => {
    const select = '*,artists:artists!consents_artist_studio_fkey(full_name)';
    const response = await fetch(`${restUrl}/rest/v1/consents?select=${encodeURIComponent(select)}`, {
      headers: headers(userAccessToken),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({ id: ids.consentA, studio_id: ids.studioA, artists: { full_name: 'SYNTHETIC ARTIST A' } }),
    ]);

    const otherStudio = await fetch(`${restUrl}/rest/v1/consents?select=${encodeURIComponent(select)}&studio_id=eq.${ids.studioB}`, {
      headers: headers(userAccessToken),
    });
    expect(otherStudio.status).toBe(200);
    expect(await otherStudio.json()).toEqual([]);
  });
});
