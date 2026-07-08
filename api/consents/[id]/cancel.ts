import type { IncomingMessage, ServerResponse } from 'http';
import { cancelConsentAsArtist } from '../../../server/consents.js';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(body);
}

function getIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/api\/consents\/([^/]+)\/cancel/);
  return match ? match[1] : null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'PATCH') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  const id = getIdFromUrl(req.url);

  if (!id) {
    sendJson(res, 400, { error: 'Falta el ID del consentimiento en la URL' });
    return;
  }

  try {
    const result = await cancelConsentAsArtist(id);
    sendJson(res, 200, result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/cancel:', err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno al descartar el consentimiento',
    });
  }
}
