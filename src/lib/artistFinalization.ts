export const STUDIO_HEALTH_UNVERIFIED_MESSAGE =
  'Faltan datos sanitarios verificados del estudio. Solicita su actualización y vuelve a intentar finalizar este mismo consentimiento.';

export type ArtistFinalizationCode =
  | 'STUDIO_HEALTH_UNVERIFIED'
  | 'FINALIZATION_RETRYABLE'
  | 'FINALIZATION_CONTENT_CONFLICT';

export interface ArtistActionError {
  code?: string;
  message: string;
  retryable: boolean;
  status?: number;
  action?: 'retry-finalization';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getPayload(error: unknown) {
  if (isRecord(error) && 'error' in error) return error.error;
  return error;
}

export function toArtistActionError(
  error: unknown,
  fallback = 'Error al firmar el documento',
  responseStatus?: number,
): ArtistActionError {
  const payload = getPayload(error);
  const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : undefined;
  const payloadMessage = isRecord(payload) && typeof payload.message === 'string' ? payload.message : undefined;
  const message = code === 'STUDIO_HEALTH_UNVERIFIED' ? STUDIO_HEALTH_UNVERIFIED_MESSAGE : payloadMessage
    ?? (payload instanceof Error ? payload.message : typeof payload === 'string' ? payload : fallback);
  const retryable = code === 'STUDIO_HEALTH_UNVERIFIED' || code === 'FINALIZATION_RETRYABLE';
  const payloadStatus = isRecord(payload) && typeof payload.status === 'number' ? payload.status : undefined;

  return {
    code,
    message,
    retryable,
    status: responseStatus ?? payloadStatus,
    ...(retryable ? { action: 'retry-finalization' as const } : {}),
  };
}

type ArtistRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function signArtistConsent(
  consentId: string,
  signature: string,
  accessToken: string,
  request: ArtistRequest = fetch,
) {
  const response = await request(`/api/consents/${encodeURIComponent(consentId)}/sign-artist`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ signature }),
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      const body = await response.text();
      payload = body ? JSON.parse(body) : undefined;
    } catch {
      payload = undefined;
    }
    throw toArtistActionError(payload, `Error al firmar el documento (HTTP ${response.status})`, response.status);
  }

  return response.json();
}
