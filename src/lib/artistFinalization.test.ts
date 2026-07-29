import { describe, expect, it, vi } from 'vitest';
import { signArtistConsent, STUDIO_HEALTH_UNVERIFIED_MESSAGE } from './artistFinalization';

type ArtistRequest = Parameters<typeof signArtistConsent>[3];

function response(body: unknown, ok: boolean, status: number) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('signArtistConsent', () => {
  it('sends the current signature to the same consent ID after attestation succeeds', async () => {
    const request = vi.fn<ArtistRequest>().mockResolvedValue(
      response({ consentId: 'consent-retry-001', status: 'signed' }, true, 200),
    );

    await expect(signArtistConsent('consent-retry-001', 'signature-current', 'token-synthetic', request)).resolves.toMatchObject({
      consentId: 'consent-retry-001',
      status: 'signed',
    });
    expect(request).toHaveBeenCalledWith(
      '/api/consents/consent-retry-001/sign-artist',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ signature: 'signature-current' }),
      }),
    );
  });

  it('keeps a blocked retry on the same consent and stable health envelope', async () => {
    const request = vi.fn<ArtistRequest>().mockResolvedValue(
      response(
        { error: { code: 'STUDIO_HEALTH_UNVERIFIED', message: STUDIO_HEALTH_UNVERIFIED_MESSAGE, retryable: true } },
        false,
        409,
      ),
    );

    await expect(signArtistConsent('consent-retry-001', 'signature-current', 'token-synthetic', request)).rejects.toMatchObject({
      code: 'STUDIO_HEALTH_UNVERIFIED',
      message: STUDIO_HEALTH_UNVERIFIED_MESSAGE,
      retryable: true,
      status: 409,
    });
    await expect(signArtistConsent('consent-retry-001', 'signature-current', 'token-synthetic', request)).rejects.toMatchObject({
      code: 'STUDIO_HEALTH_UNVERIFIED',
      retryable: true,
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe('/api/consents/consent-retry-001/sign-artist');
    expect(request.mock.calls[1][0]).toBe('/api/consents/consent-retry-001/sign-artist');
  });

  it('finalizes the existing consent after a mocked health attestation', async () => {
    const request = vi.fn<ArtistRequest>()
      .mockResolvedValueOnce(response({ error: { code: 'STUDIO_HEALTH_UNVERIFIED', retryable: true } }, false, 409))
      .mockResolvedValueOnce(response({ consentId: 'consent-retry-001', status: 'signed' }, true, 200));

    await expect(signArtistConsent('consent-retry-001', 'signature-current', 'token-synthetic', request)).rejects.toMatchObject({
      code: 'STUDIO_HEALTH_UNVERIFIED',
    });
    await expect(signArtistConsent('consent-retry-001', 'signature-current', 'token-synthetic', request)).resolves.toMatchObject({
      consentId: 'consent-retry-001',
      status: 'signed',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/consents/consent-retry-001/sign-artist', expect.any(Object));
  });
});
