// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsentsManager from './ConsentsManager';

const harness = vi.hoisted(() => {
  const consent = {
    id: 'consent-tenant-safe',
    studio_id: 'studio-a',
    artist_id: 'artist-a',
    client_full_name: 'Cliente Sintetico',
    client_dni: 'TEST-DNI',
    created_at: '2026-08-21T12:00:00.000Z',
    status: 'signed',
    final_file_id: 'final-file-a',
    artists: { full_name: 'Artista del estudio' },
  };
  const listQuery: any = {
    select: vi.fn(() => listQuery),
    eq: vi.fn(() => listQuery),
    order: vi.fn(),
  };
  const fileQuery: any = {
    select: vi.fn(() => fileQuery),
    eq: vi.fn(() => fileQuery),
    in: vi.fn(() => bulkQuery),
    single: vi.fn(),
  };
  const bulkQuery: any = { eq: vi.fn() };
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  const storage = { download: vi.fn(), createSignedUrl: vi.fn() };
  const client = {
    from: vi.fn((table: string) => table === 'consents' ? listQuery : fileQuery),
    channel: vi.fn(() => channel),
    storage: { from: vi.fn(() => storage) },
  };

  return { bulkQuery, channel, client, consent, fileQuery, listQuery, storage };
});

vi.mock('@/utils/supabase/client', () => ({ createClient: () => harness.client }));

vi.mock('@/src/components/SensitiveText', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/src/components/DatePicker', () => ({
  default: ({ placeholder }: { placeholder: string }) => <input aria-label={placeholder} />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  harness.listQuery.order.mockResolvedValue({ data: [harness.consent], error: null });
  harness.fileQuery.single.mockResolvedValue({ data: { storage_path: 'studio-a/final-file-a.pdf' }, error: null });
  harness.bulkQuery.eq.mockResolvedValue({
    data: [{ id: 'final-file-a', consent_id: 'consent-tenant-safe', storage_path: 'studio-a/final-file-a.pdf' }],
    error: null,
  });
  harness.storage.download.mockResolvedValue({ data: new Blob(['immutable-pdf']), error: null });
  harness.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://invalid.local/signed' }, error: null });
  vi.spyOn(window, 'open').mockImplementation(() => null);
  Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:final-file-a') });
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ConsentsManager tenant-safe artist listing', () => {
  it('qualifies the composite artist relationship while preserving the artists response shape', async () => {
    render(<ConsentsManager studioId="studio-a" />);

    expect(await screen.findByText('Artista del estudio')).toBeVisible();
    expect(harness.client.from).toHaveBeenCalledWith('consents');
    expect(harness.listQuery.select).toHaveBeenCalledWith(
      '*, artists:artists!consents_artist_studio_fkey(full_name)',
    );
    expect(harness.listQuery.eq).toHaveBeenCalledWith('studio_id', 'studio-a');
  });

  it('binds a different active studio to the same qualified selector', async () => {
    render(<ConsentsManager studioId="studio-b" />);

    await waitFor(() => expect(harness.listQuery.order).toHaveBeenCalled());
    expect(harness.listQuery.select).toHaveBeenCalledWith(
      '*, artists:artists!consents_artist_studio_fkey(full_name)',
    );
    expect(harness.listQuery.eq).toHaveBeenCalledWith('studio_id', 'studio-b');
  });
});

describe('ConsentsManager immutable individual download', () => {
  it('downloads only the referenced final file with an opaque safe filename', async () => {
    let clickedAnchor: HTMLAnchorElement | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor() {
      clickedAnchor = this;
    });
    render(<ConsentsManager studioId="studio-a" />);

    await userEvent.setup().click(await screen.findByRole('button', { name: /ver \/ descargar/i }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(harness.fileQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'final-file-a');
    expect(harness.fileQuery.eq).toHaveBeenNthCalledWith(2, 'document_kind', 'final');
    expect(harness.storage.download).toHaveBeenCalledWith('studio-a/final-file-a.pdf');
    expect(clickedAnchor?.download).toBe('Consentimiento_consent-tenant-safe.pdf');
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:final-file-a');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('does not offer or fabricate a download when final-file metadata is missing', async () => {
    harness.listQuery.order.mockResolvedValue({ data: [{ ...harness.consent, final_file_id: null }], error: null });
    render(<ConsentsManager studioId="studio-a" />);

    expect(await screen.findByText('Incompleto')).toBeVisible();
    expect(screen.queryByRole('button', { name: /ver \/ descargar/i })).not.toBeInTheDocument();
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('reports an unavailable or unauthorized final file without false success', async () => {
    harness.fileQuery.single.mockResolvedValue({ data: null, error: { code: '42501' } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ConsentsManager studioId="studio-a" />);

    await userEvent.setup().click(await screen.findByRole('button', { name: /ver \/ descargar/i }));

    expect(await screen.findByText('No fue posible acceder al PDF final')).toBeVisible();
    expect(harness.storage.download).not.toHaveBeenCalled();
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('reports a missing immutable storage object without creating a download', async () => {
    harness.storage.download.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ConsentsManager studioId="studio-a" />);

    await userEvent.setup().click(await screen.findByRole('button', { name: /ver \/ descargar/i }));

    expect(await screen.findByText('No fue posible acceder al PDF final')).toBeVisible();
    expect(harness.storage.download).toHaveBeenCalledWith('studio-a/final-file-a.pdf');
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });
});

describe('ConsentsManager truthful ZIP export', () => {
  it('reports actual partial counts and queries only authenticated final metadata', async () => {
    harness.listQuery.order.mockResolvedValue({
      data: [harness.consent, { ...harness.consent, id: 'pending-b', status: 'pending_artist', final_file_id: null }],
      error: null,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ConsentsManager studioId="studio-a" />);

    await userEvent.setup().click(await screen.findByRole('button', { name: /exportar todos/i }));

    expect(await screen.findByText('Exportados: 1. Omitidos: 1. Fallidos: 0.')).toBeVisible();
    expect(harness.fileQuery.in).toHaveBeenCalledWith('id', ['final-file-a']);
    expect(harness.bulkQuery.eq).toHaveBeenCalledWith('document_kind', 'final');
    expect(click).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain('Cliente Sintetico.pdf');
  });

  it('refuses zero-success exports without false download and preserves a retryable selection', async () => {
    harness.bulkQuery.eq.mockResolvedValue({ data: [], error: null });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ConsentsManager studioId="studio-a" />);
    await userEvent.setup().click((await screen.findAllByRole('checkbox'))[1]);

    await userEvent.setup().click(screen.getByRole('button', { name: /^exportar zip$/i }));

    expect(await screen.findByText('No se pudo exportar ningún PDF. Omitidos: 0. Fallidos: 1.')).toBeVisible();
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByText('1 consentimiento seleccionado')).toBeVisible();
  });

  it('disables ZIP actions when the current rows have no final PDF', async () => {
    harness.listQuery.order.mockResolvedValue({ data: [{ ...harness.consent, status: 'pending_artist', final_file_id: null }], error: null });
    render(<ConsentsManager studioId="studio-a" />);

    expect(await screen.findByRole('button', { name: /exportar todos/i })).toBeDisabled();
    await userEvent.setup().click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByRole('button', { name: /^exportar zip$/i })).toBeDisabled();
  });
});
