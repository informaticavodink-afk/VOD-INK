import type { IncomingMessage, ServerResponse } from 'http';
import { generateAndSubmitConsent } from '../../server/consents.js';
import { parseBody } from '../_lib/parseBody.js';
import type { WizardState } from '../../src/types';

interface ConsentsPostBody {
  state?: WizardState;
  idempotencyKey?: string;
  driveAccessToken?: string;
}

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(body);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const { state, idempotencyKey, driveAccessToken } = await parseBody<ConsentsPostBody>(req);

    if (!state || !idempotencyKey) {
      sendJson(res, 400, { error: 'Faltan state o idempotencyKey' });
      return;
    }

    const result = await generateAndSubmitConsent(state, idempotencyKey, driveAccessToken);
    sendJson(res, 200, result);
  } catch (err) {
    console.error('Error en /api/consents:', err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno al procesar el consentimiento',
    });
  }
}
