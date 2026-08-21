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
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: false }],
        error: null,
      })
      .mockResolvedValueOnce({ data: studio, error: null });

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

  it('keeps the complete legacy payload on the legacy RPC while the contract is disabled', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: false }],
        error: null,
      })
      .mockResolvedValueOnce({ data: studio, error: null });

    await expect(updateStudioSettings(profile as never, validPayload, { rpc } as never)).resolves.toEqual(studio);

    expect(rpc).toHaveBeenNthCalledWith(1, 'get_registration_attestation_contract_state', {});
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'update_studio_settings_as_manager',
      expect.objectContaining({ p_health_authorization_date: '2025-01-10' })
    );
    expect(rpc).not.toHaveBeenCalledWith('update_studio_settings_as_manager_v2', expect.anything());
  });

  it('maps a disabled-contract legacy RPC error without fetching or switching to v2', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: false }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error('password=super-secret backend diagnostic'),
      });
    const from = vi.fn();
    const client = { rpc, from };

    await expect(updateStudioSettings(profile as never, validPayload, client as never))
      .rejects.toThrow('No se pudo actualizar el estudio');

    expect(rpc).not.toHaveBeenCalledWith('update_studio_settings_as_manager_v2', expect.anything());
    expect(from).not.toHaveBeenCalled();
  });

  it('uses v2 without forwarding the legacy date while the contract is enabled', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: true }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ outcome_code: 'REGISTRATION_UNCHANGED', attested: true, contract_version: 'registration-only-v2' }],
        error: null,
      });
    const single = vi.fn().mockResolvedValue({ data: studio, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const client = { rpc, from: vi.fn(() => ({ select })) };

    await expect(updateStudioSettings(profile as never, validPayload, client as never)).resolves.toEqual(studio);

    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'update_studio_settings_as_manager_v2',
      {
        p_actor_profile_id: profile.id,
        p_studio_id: profile.studio_id,
        p_legal_name: 'Estudio Legal',
        p_trade_name: 'Estudio Comercial',
        p_tax_id: 'TEST-ID',
        p_address: 'Calle Test 1',
        p_city: 'Santander',
        p_postal_code: '39001',
        p_phone: '600000000',
        p_health_registration_number: 'REG-REAL-001',
        p_attest_health_data: true,
        p_contract_version: 'registration-only-v2',
      }
    );
    expect(rpc).not.toHaveBeenCalledWith('update_studio_settings_as_manager', expect.anything());
  });

  it('returns the generic settings error when the enabled v2 RPC rejects without fetching or falling back', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: true }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error('permission denied') });
    const from = vi.fn();
    const client = { rpc, from };

    await expect(updateStudioSettings(profile as never, validPayload, client as never))
      .rejects.toThrow('No se pudo actualizar el estudio');

    expect(rpc).toHaveBeenNthCalledWith(2, 'update_studio_settings_as_manager_v2', {
      p_actor_profile_id: profile.id,
      p_studio_id: profile.studio_id,
      p_legal_name: 'Estudio Legal',
      p_trade_name: 'Estudio Comercial',
      p_tax_id: 'TEST-ID',
      p_address: 'Calle Test 1',
      p_city: 'Santander',
      p_postal_code: '39001',
      p_phone: '600000000',
      p_health_registration_number: 'REG-REAL-001',
      p_attest_health_data: true,
      p_contract_version: 'registration-only-v2',
    });
    expect(rpc).not.toHaveBeenCalledWith('update_studio_settings_as_manager', expect.anything());
    expect(from).not.toHaveBeenCalled();
  });

  it('returns the generic settings error for an unsupported enabled v2 outcome without fetching or falling back', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: [{ contract_version: 'registration-only-v2', enabled: true }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ outcome_code: 'REGISTRATION_REJECTED', contract_version: 'registration-only-v2' }],
        error: null,
      });
    const from = vi.fn();
    const client = { rpc, from };

    await expect(updateStudioSettings(profile as never, validPayload, client as never))
      .rejects.toThrow('No se pudo actualizar el estudio');

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).not.toHaveBeenCalledWith('update_studio_settings_as_manager', expect.anything());
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['returns an RPC error', { data: null, error: new Error('reader unavailable') }],
    ['returns no state', { data: [], error: null }],
    ['returns multiple states', { data: [{ contract_version: 'registration-only-v2', enabled: false }, { contract_version: 'registration-only-v2', enabled: false }], error: null }],
    ['returns an unexpected version', { data: [{ contract_version: 'other', enabled: false }], error: null }],
    ['returns a malformed enabled state', { data: [{ contract_version: 'registration-only-v2', enabled: 'false' }], error: null }],
  ])('fails closed without a settings mutation when the reader %s', async (_description, response) => {
    const rpc = vi.fn().mockResolvedValueOnce(response);

    await expect(updateStudioSettings(profile as never, validPayload, { rpc } as never))
      .rejects.toThrow('No se pudo actualizar el estudio');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_registration_attestation_contract_state', {});
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

  it('keeps the legacy service-role RPC executable while v2 is disabled', () => {
    const migration = readFileSync(
      'supabase/migrations/20260812122407_registration_attestation_compatibility.sql',
      'utf8'
    );
    expect(migration).not.toMatch(
      /revoke execute on function public\.update_studio_settings_as_manager\([\s\S]*?from service_role/i
    );
  });
});
