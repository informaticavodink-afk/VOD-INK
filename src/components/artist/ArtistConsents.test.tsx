// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArtistConsents from './ArtistConsents';
import { openStorageDocument } from '@/src/lib/fileDownload';

vi.mock('@/src/lib/fileDownload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/fileDownload')>();
  return { ...actual, openStorageDocument: vi.fn() };
});

const harness = vi.hoisted(() => {
  const signed = {
    id: 'consent-final',
    status: 'signed',
    created_at: '2026-08-21T12:00:00.000Z',
    client_full_name: 'Cliente Firmado',
    client_dni: 'DNI-FIRMADO',
    final_file_id: 'final-file-a',
    studios: { trade_name: 'Estudio Sintetico' },
  };
  const pending = {
    ...signed,
    id: 'consent-pending',
    status: 'pending_artist',
    client_full_name: 'Cliente Pendiente',
    final_file_id: null,
  };
  const listQuery: any = {
    select: vi.fn(() => listQuery),
    eq: vi.fn(() => listQuery),
    order: vi.fn(),
  };
  const fileQuery: any = {
    select: vi.fn(() => fileQuery),
    eq: vi.fn(() => fileQuery),
    single: vi.fn(),
  };
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  const storage = { createSignedUrl: vi.fn() };
  const client = {
    from: vi.fn((table: string) => (table === 'consents' ? listQuery : fileQuery)),
    getChannels: vi.fn(() => []),
    removeChannel: vi.fn(),
    channel: vi.fn(() => channel),
    storage: { from: vi.fn(() => storage) },
  };
  return { channel, client, fileQuery, listQuery, pending, signed, storage };
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
  harness.listQuery.order.mockResolvedValue({ data: [harness.signed], error: null });
  harness.fileQuery.single.mockResolvedValue({ data: { storage_path: 'studio-a/final-file-a.pdf' }, error: null });
  harness.storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://invalid.local/signed' }, error: null });
  vi.spyOn(window, 'open').mockImplementation(() => null);
  Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:final-file') });
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderArtistConsents() {
  render(
    <ArtistConsents
      artistId="artist-a"
      artist={null}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      onPreviewConsent={vi.fn()}
      onInterveneConsent={vi.fn()}
    />,
  );
}

describe('ArtistConsents signed file actions', () => {
  it('offers Ver and Descargar for a signed consent with a final file', async () => {
    renderArtistConsents();

    expect(await screen.findByRole('button', { name: 'Abrir PDF firmado' })).toBeVisible();
    expect(screen.getByRole('button', { name: /descargar/i })).toBeVisible();
  });

  it('keeps VER and FIRMAR for pending consents', async () => {
    harness.listQuery.order.mockResolvedValue({ data: [harness.pending], error: null });
    renderArtistConsents();

    expect(await screen.findByRole('button', { name: 'Ver datos del cliente' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Firmar intervención y consentimiento' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Abrir PDF firmado' })).not.toBeInTheDocument();
  });

  it('downloads through a signed URL with the safe filename and without window.open', async () => {
    let clickedAnchor: HTMLAnchorElement | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor() {
      clickedAnchor = this;
    });
    renderArtistConsents();

    await userEvent.setup().click(await screen.findByRole('button', { name: /descargar/i }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(harness.fileQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'final-file-a');
    expect(harness.fileQuery.eq).toHaveBeenNthCalledWith(2, 'document_kind', 'final');
    expect(harness.storage.createSignedUrl).toHaveBeenCalledWith(
      'studio-a/final-file-a.pdf',
      60,
      { download: 'Consentimiento_consent-final.pdf' },
    );
    expect(clickedAnchor?.download).toBe('Consentimiento_consent-final.pdf');
    expect(clickedAnchor?.getAttribute('href')).toBe('https://invalid.local/signed');
    expect(window.open).not.toHaveBeenCalled();
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('opens the signed PDF through a signed URL without a download name', async () => {
    renderArtistConsents();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Abrir PDF firmado' }));

    await waitFor(() => expect(vi.mocked(openStorageDocument)).toHaveBeenCalledOnce());
    expect(harness.storage.createSignedUrl).toHaveBeenCalledWith('studio-a/final-file-a.pdf', 60);
    expect(vi.mocked(openStorageDocument)).toHaveBeenCalledWith('https://invalid.local/signed');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('reports a missing final metadata row without opening or downloading anything', async () => {
    harness.fileQuery.single.mockResolvedValue({ data: null, error: { code: '42501' } });
    renderArtistConsents();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Abrir PDF firmado' }));

    expect(await screen.findByText('No se encontró el archivo PDF')).toBeVisible();
    expect(harness.storage.createSignedUrl).not.toHaveBeenCalled();
    expect(vi.mocked(openStorageDocument)).not.toHaveBeenCalled();
  });

  it('reports a signed URL failure without delivering the document', async () => {
    harness.storage.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderArtistConsents();

    await userEvent.setup().click(await screen.findByRole('button', { name: /descargar/i }));

    expect(await screen.findByText('Error al generar enlace de descarga')).toBeVisible();
    expect(click).not.toHaveBeenCalled();
  });
});
