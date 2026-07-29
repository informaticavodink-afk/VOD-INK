// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArtistPage from './ArtistPage';

const harness = vi.hoisted(() => {
  const pending = {
    id: 'consent-page-retry',
    status: 'pending_artist',
    technique_data: { denominacionGenerica: 'Tatuaje' },
    client_full_name: 'Cliente Pendiente Sintético',
  };
  const artist = { id: 'artist-page-retry', profile_id: 'artist-profile-retry' };
  const supabase = {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        order: vi.fn().mockResolvedValue({ data: table === 'consents' ? [pending] : undefined, error: null }),
        single: vi.fn().mockResolvedValue({ data: artist, error: null }),
      };
      return query;
    }),
    auth: { getSession: vi.fn() },
    getChannels: vi.fn(() => []),
    removeChannel: vi.fn(),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
      };
      return channel;
    }),
  };
  return { artist, pending, supabase };
});

vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'artist-user-retry' }, loading: false }),
}));
vi.mock('@/src/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { id: 'artist-profile-retry', role: 'artist' }, loading: false }),
}));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => harness.supabase }));
vi.mock('@/src/components/artist/ArtistLayout', () => ({
  default: ({ pendingConsents, children }: any) => (
    <section>
      <div data-testid="pending-card">{pendingConsents.map((consent: any) => `${consent.id}:${consent.status}`)}</div>
      {children}
    </section>
  ),
}));
vi.mock('@/src/components/artist/ArtistConsents', () => ({
  default: ({ artistId, onInterveneConsent }: any) => (
    <div>
      <span data-testid="artist-consents-artist">{artistId}</span>
      <button type="button" onClick={() => onInterveneConsent(harness.pending)}>Open pending consent</button>
    </div>
  ),
}));
vi.mock('@/src/components/artist/InterventionModal', () => ({
  default: ({ isOpen, consent, onSave, error }: any) => isOpen ? (
    <div>
      <span data-testid="modal-consent">{consent.id}</span>
      <button type="button" onClick={() => void onSave(consent.technique_data, 'signature-current')}>Retry same consent</button>
      {error && <span data-testid="retry-error">{error.code}</span>}
    </div>
  ) : null,
}));
vi.mock('@/src/components/admin/LoginForm', () => ({ default: () => null }));
vi.mock('@/src/components/artist/ArtistConsentDetailsModal', () => ({ default: () => null }));

const blockedResponse = {
  ok: false,
  status: 409,
  text: vi.fn().mockResolvedValue(JSON.stringify({
    error: { code: 'STUDIO_HEALTH_UNVERIFIED', retryable: true },
  })),
} as unknown as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ArtistPage retry wiring', () => {
  beforeEach(() => {
    harness.supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-retry' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(blockedResponse));
  });

  it('keeps the pending card and retries the same ID with the current signature', async () => {
    const user = userEvent.setup();
    render(<ArtistPage />);

    await waitFor(() => expect(screen.getByTestId('pending-card')).toHaveTextContent('consent-page-retry:pending_artist'));
    expect(screen.getByTestId('artist-consents-artist')).toHaveTextContent('artist-page-retry');

    await user.click(screen.getByRole('button', { name: 'Open pending consent' }));
    expect(screen.getByTestId('modal-consent')).toHaveTextContent('consent-page-retry');
    await user.click(screen.getByRole('button', { name: 'Retry same consent' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/consents/consent-page-retry/sign-artist',
      expect.objectContaining({ body: JSON.stringify({ signature: 'signature-current' }) }),
    ));
    expect(screen.getByTestId('pending-card')).toHaveTextContent('consent-page-retry:pending_artist');
    expect(screen.getByTestId('retry-error')).toHaveTextContent('STUDIO_HEALTH_UNVERIFIED');
  });
});
