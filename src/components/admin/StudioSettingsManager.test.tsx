// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudioSettingsManager from './StudioSettingsManager';

const studio = {
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
  health_data_verified_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-07-29T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StudioSettingsManager', () => {
  it('loads studio data without exposing an authorization date and attests the registration number', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ studio }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studio: { ...studio, health_data_verified_at: '2026-07-29T13:00:00.000Z' },
      }), { status: 200 }));
    const user = userEvent.setup();

    render(<StudioSettingsManager />);

    expect(await screen.findByDisplayValue('Estudio Legal')).toBeVisible();
    expect(screen.getByText('Pendiente')).toBeVisible();
    expect(screen.queryByLabelText(/fecha de autorización/i)).not.toBeInTheDocument();

    const confirmation = screen.getByRole('checkbox', {
      name: /número de registro coincide con la autorización sanitaria oficial/i,
    });
    expect(confirmation).not.toBeChecked();
    await user.click(confirmation);
    await user.click(screen.getByRole('button', { name: 'Guardar y confirmar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(request.method).toBe('PATCH');
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({
      legal_name: 'Estudio Legal',
      health_registration_number: 'REG-REAL-001',
      attest_health_data: true,
    });
    expect(body).not.toHaveProperty('health_authorization_date');
    expect(await screen.findByText(/estado sanitario confirmado/i)).toBeVisible();
  });

  it('keeps attestation unavailable when the registration number is missing', async () => {
    const withoutHealth = {
      ...studio,
      health_registration_number: null,
      health_authorization_date: null,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ studio: withoutHealth }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ studio: withoutHealth }), { status: 200 }));
    const user = userEvent.setup();

    render(<StudioSettingsManager />);
    expect(await screen.findByDisplayValue('Estudio Legal')).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Guardar datos' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({
      attest_health_data: false,
      health_registration_number: '',
    });
    expect(body).not.toHaveProperty('health_authorization_date');
    expect(await screen.findByText(/confirmación sanitaria sigue pendiente/i)).toBeVisible();
  });
});
