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
  status: 'signed' | 'pending_artist' | 'upload_error';
  storagePath: string;
  driveFileId: string | null;
  driveViewLink: string | null;
}

const IDEMPOTENCY_KEY_STORAGE = 'vod_ink_idempotency_key';

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
  const response = await fetch('/api/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Error desconocido al enviar el consentimiento' }));
    throw new Error(errorBody.error || `Error ${response.status}`);
  }

  return response.json();
}
