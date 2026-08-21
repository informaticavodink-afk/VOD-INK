import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({ createServiceClient: vi.fn() }));
vi.mock('./admins.js', () => ({
  getCurrentManagerProfile: vi.fn(),
  getErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Error interno del servidor',
}));
vi.mock('./studioSettings.js', () => ({
  getStudioSettings: vi.fn(),
  updateStudioSettings: vi.fn(),
}));
vi.mock('../utils/supabase/vercel.js', () => ({ createVercelSupabaseClient: vi.fn() }));

import { createServiceClient } from './supabase.js';
import { getCurrentManagerProfile } from './admins.js';
import { getStudioSettings, updateStudioSettings } from './studioSettings.js';
import { createVercelSupabaseClient } from '../utils/supabase/vercel.js';
import { readStudioSettings, saveStudioSettings } from './routes/studioSettings.js';
import vercelStudioSettings from '../api/studio-settings.js';

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedGetCurrentManagerProfile = vi.mocked(getCurrentManagerProfile);
const mockedGetStudioSettings = vi.mocked(getStudioSettings);
const mockedUpdateStudioSettings = vi.mocked(updateStudioSettings);
const mockedCreateVercelSupabaseClient = vi.mocked(createVercelSupabaseClient);

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  studio_id: '22222222-2222-4222-8222-222222222222',
  role: 'admin',
};

const studio = { id: profile.studio_id, trade_name: 'Estudio de prueba' };

function expressResponse() {
  const result = { statusCode: 200, body: undefined as unknown };
  const response = {
    status(code: number) {
      result.statusCode = code;
      return response;
    },
    json(body: unknown) {
      result.body = body;
      return response;
    },
  };
  return { response: response as unknown as Response, result };
}

function vercelRequest(body: unknown) {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'PATCH',
    url: '/api/studio-settings',
    headers: { 'content-type': 'application/json' },
  }) as IncomingMessage;
}

function vercelResponse() {
  const result = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
  };
  const response = {
    set statusCode(code: number) {
      result.statusCode = code;
    },
    get statusCode() {
      return result.statusCode;
    },
    setHeader(name: string, value: unknown) {
      result.headers[name] = value;
    },
    end(chunk?: string) {
      result.body = chunk ? JSON.parse(chunk) : undefined;
    },
  };
  return { response: response as unknown as ServerResponse, result };
}

async function saveThroughBothAdapters(payload: Record<string, unknown>) {
  const express = expressResponse();
  const vercel = vercelResponse();

  await saveStudioSettings({ body: payload, supabase: {} } as Request, express.response);
  await vercelStudioSettings(vercelRequest(payload), vercel.response);

  return { express: express.result, vercel: vercel.result };
}

describe('studio settings adapter parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const serviceClient = { service: 'synthetic' };
    mockedCreateServiceClient.mockReturnValue(serviceClient as never);
    mockedCreateVercelSupabaseClient.mockReturnValue({ auth: {} } as never);
    mockedGetCurrentManagerProfile.mockResolvedValue(profile as never);
    mockedUpdateStudioSettings.mockResolvedValue(studio as never);
  });

  it.each([
    ['disabled contract', '2025-01-10'],
    ['enabled contract', '2025-02-11'],
  ])('forwards the legacy date unchanged through both adapters while the dispatcher handles the %s path', async (_state, health_authorization_date) => {
    const payload = {
      legal_name: 'Estudio Legal',
      health_registration_number: 'REG-001',
      health_authorization_date,
      attest_health_data: true,
    };

    const { express, vercel } = await saveThroughBothAdapters(payload);

    expect(express).toEqual({ statusCode: 200, body: { studio } });
    expect(vercel).toEqual(expect.objectContaining({ statusCode: 200, body: { studio } }));
    expect(mockedUpdateStudioSettings).toHaveBeenCalledTimes(2);
    for (const [, forwardedPayload, serviceClient] of mockedUpdateStudioSettings.mock.calls) {
      expect(forwardedPayload).toEqual(payload);
      expect(serviceClient).toEqual({ service: 'synthetic' });
    }
  });

  it('returns the same 401 envelope before either adapter invokes the shared dispatcher', async () => {
    mockedGetCurrentManagerProfile.mockRejectedValue(new Error('No autenticado'));
    const payload = { health_authorization_date: '2025-01-10' };

    const { express, vercel } = await saveThroughBothAdapters(payload);

    expect(express).toEqual({ statusCode: 401, body: { error: 'No autenticado' } });
    expect(vercel).toEqual(expect.objectContaining({ statusCode: 401, body: { error: 'No autenticado' } }));
    expect(mockedUpdateStudioSettings).not.toHaveBeenCalled();
  });

  it('keeps the established safe 404 envelope for a missing studio in both adapters', async () => {
    mockedGetStudioSettings.mockRejectedValue(new Error('No se encontró el estudio'));
    const express = expressResponse();
    const vercel = vercelResponse();

    await readStudioSettings({ supabase: {} } as Request, express.response);
    await vercelStudioSettings(Object.assign(Readable.from([]), { method: 'GET' }) as IncomingMessage, vercel.response);

    expect(express.result).toEqual({ statusCode: 404, body: { error: 'No se encontró el estudio' } });
    expect(vercel.result).toEqual(expect.objectContaining({ statusCode: 404, body: { error: 'No se encontró el estudio' } }));
  });

  it('does not disclose a raw backend error from either adapter', async () => {
    mockedUpdateStudioSettings.mockRejectedValue(new Error('password=synthetic-secret backend diagnostic'));
    const payload = { health_authorization_date: '2025-01-10' };

    const { express, vercel } = await saveThroughBothAdapters(payload);

    for (const result of [express, vercel]) {
      expect(result.statusCode).toBe(400);
      expect(result.body).toEqual({ error: 'No se pudo procesar la configuración del estudio' });
      expect(JSON.stringify(result.body)).not.toContain('synthetic-secret');
    }
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('synthetic-secret');
  });
});