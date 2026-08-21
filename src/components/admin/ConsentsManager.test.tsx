// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    status: 'pending_artist',
    final_file_id: null,
    artists: { full_name: 'Artista del estudio' },
  };
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(),
  };
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  const client = {
    from: vi.fn(() => query),
    channel: vi.fn(() => channel),
  };

  return { channel, client, consent, query };
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
  harness.query.order.mockResolvedValue({ data: [harness.consent], error: null });
});

afterEach(cleanup);

describe('ConsentsManager tenant-safe artist listing', () => {
  it('qualifies the composite artist relationship while preserving the artists response shape', async () => {
    render(<ConsentsManager studioId="studio-a" />);

    expect(await screen.findByText('Artista del estudio')).toBeVisible();
    expect(harness.client.from).toHaveBeenCalledWith('consents');
    expect(harness.query.select).toHaveBeenCalledWith(
      '*, artists:artists!consents_artist_studio_fkey(full_name)',
    );
    expect(harness.query.eq).toHaveBeenCalledWith('studio_id', 'studio-a');
  });

  it('binds a different active studio to the same qualified selector', async () => {
    render(<ConsentsManager studioId="studio-b" />);

    await waitFor(() => expect(harness.query.order).toHaveBeenCalled());
    expect(harness.query.select).toHaveBeenCalledWith(
      '*, artists:artists!consents_artist_studio_fkey(full_name)',
    );
    expect(harness.query.eq).toHaveBeenCalledWith('studio_id', 'studio-b');
  });
});
