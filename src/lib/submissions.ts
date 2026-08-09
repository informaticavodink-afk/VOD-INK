/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WizardState } from '../types';

export interface SubmitConsentApiPayload {
  state: WizardState;
  idempotencyKey: string;
  driveAccessToken?: string;
}

export interface SubmitConsentApiResponse {
  consentId: string;
  status: 'signed' | 'pending_technique' | 'pending_artist' | 'upload_error';
  storagePath: string;
  driveFileId: string | null;
  driveViewLink: string | null;
}

const IDEMPOTENCY_KEY_STORAGE = 'vod_ink_idempotency_key';
const SUBMISSION_CODES = new Set([
  'SUBMISSION_INVALID', 'REPRESENTATION_INVALID', 'SUBMISSION_CONFLICT',
  'SUBMISSION_TEMPORARILY_UNAVAILABLE', 'SUBMISSION_FAILED',
]);
const SAFE_TOKEN = /^[A-Za-z0-9_-]{1,128}$/;

export class SubmissionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
    readonly correlationId: string,
  ) {
    super(message);
    this.name = 'SubmissionError';
  }
}

export function normalizeSubmissionError(body: unknown, status = 0): SubmissionError {
  const candidate = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  if (candidate && typeof candidate === 'object') {
    const error = candidate as Record<string, unknown>;
    if (typeof error.code === 'string' && SUBMISSION_CODES.has(error.code) &&
      typeof error.message === 'string' && error.message.trim() && error.message.length <= 240 &&
      typeof error.retryable === 'boolean' && typeof error.correlationId === 'string' &&
      SAFE_TOKEN.test(error.correlationId)) {
      return new SubmissionError(error.message, error.code, error.retryable, error.correlationId);
    }
  }
  const retryable = status === 0 || status >= 500;
  return new SubmissionError(
    retryable ? 'No se pudo completar el envío. Vuelve a intentarlo.' : 'Revisa los datos enviados e inténtalo de nuevo.',
    retryable ? 'SUBMISSION_FAILED' : 'SUBMISSION_INVALID', retryable, 'no-disponible',
  );
}

export function getOrCreateIdempotencyKey(): string {
  const existing = sessionStorage.getItem(IDEMPOTENCY_KEY_STORAGE);
  if (existing) return existing;

  const key = crypto.randomUUID();
  sessionStorage.setItem(IDEMPOTENCY_KEY_STORAGE, key);
  return key;
}

export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(IDEMPOTENCY_KEY_STORAGE);
}

export async function submitConsentToApi(payload: SubmitConsentApiPayload): Promise<SubmitConsentApiResponse> {
  let response: Response;
  try {
    response = await fetch('/api/consents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
  } catch {
    throw normalizeSubmissionError(undefined, 0);
  }
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) throw normalizeSubmissionError(body, response.status);
  return body as SubmitConsentApiResponse;
}
