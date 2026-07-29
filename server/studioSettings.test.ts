import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  getStudioSettings,
  parseStudioSettingsPayload,
  updateStudioSettings,
  type StudioSettings,
} from './studioSettings.js';
import { getCurrentManagerProfile } from './admins.js';

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  studio_id: '22222222-2222-4222-8222-222222222222',
  role: 'admin',
};

const studio: StudioSettings = {
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'studio-test',
  legal_name: 'Estudio Legal',
  trade_name: 'Estudio Comercial',
  tax_id: 'TEST-ID',
  address: 'Calle Test 1',
  city: 'Santander',
  postal_code: '39001',
  phone: '600000000',
  health_registration_number: 'REG-REAL-001',
  health_authorization_date: '2025-01-10',
  health_data_verified_at: '2026-07-29T12:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-07-29T12:00:00.000Z',
};

const validPayload = {
  legal_name: '  Estudio Legal  ',
  trade_name: 'Estudio Comercial',
  tax_id: 'TEST-ID',
  address: 'Calle Test 1',
  city: 'Santander',
  postal_code: '39001',
  phone: '600000000',
  health_registration_number: ' REG-REAL-001 ',
  health_authorization_date: '2025-01-10',
  attest_health_data: true,
};

describe('studio settings validation', () => {
  it('normalizes complete studio data and preserves an explicit attestation', () => {
    expect(parseStudioSettingsPayload(validPayload)).toEqual({
      ...validPayload,
      legal_name: 'Estudio Legal',
      health_registration_number: 'REG-REAL-001',
    });
  });

  it('rejects partial, future, demo and incomplete attestation data', () => {
    expect(() => parseStudioSettingsPayload({
      ...validPayload,
      health_authorization_date: '',
    })).toThrow(/deben completarse juntos/);

    expect(() => parseStudioSettingsPayload({
      ...validPayload,
      health_authorization_date: '2999-01-01',
    })).toThrow(/no puede ser futura/);

    expect(() => parseStudioSettingsPayload({
      ...validPayload,
      health_registration_number: 'SAN/07/2024-C',
      health_authorization_date: '2024-06-15',
    })).toThrow(/demostración/);

    expect(() => parseStudioSettingsPayload({
      ...validPayload,
      health_registration_number: '',
      health_authorization_date: '',
    })).toThrow(/antes de confirmarlos/);
  });
});

describe('studio settings persistence boundary', () => {
  it('rejects tattoo artist profiles before studio data is returned or updated', async () => {
    const authClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'artist-user-id' } },
          error: null,
        }),
      },
    };
    const single = vi.fn().mockResolvedValue({
      data: { ...profile, role: 'artist' },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const serviceClient = { from: vi.fn(() => ({ select })) };

    await expect(
      getCurrentManagerProfile(authClient as never, serviceClient as never)
    ).rejects.toThrow(/No tienes permisos/);
  });

  it('reads only the manager studio', async () => {
    const single = vi.fn().mockResolvedValue({ data: studio, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };

    await expect(getStudioSettings(profile as never, client as never)).resolves.toEqual(studio);
    expect(eq).toHaveBeenCalledWith('id', studio.id);
  });

  it('sends actor and studio ids to the service-role-only atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: studio, error: null });

    await expect(updateStudioSettings(profile as never, validPayload, { rpc } as never)).resolves.toEqual(studio);
    expect(rpc).toHaveBeenCalledWith(
      'update_studio_settings_as_manager',
      expect.objectContaining({
        p_actor_profile_id: profile.id,
        p_studio_id: profile.studio_id,
        p_attest_health_data: true,
        p_health_registration_number: 'REG-REAL-001',
      })
    );
  });

  it('defines an atomic SECURITY INVOKER function unavailable to browser roles', () => {
    const migration = readFileSync(
      'supabase/migrations/20260729131436_add_admin_studio_settings_attestation.sql',
      'utf8'
    );

    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/insert into public\.audit_logs/i);
    expect(migration).toMatch(/revoke all on function[\s\S]+from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function[\s\S]+to service_role/i);
  });
});
