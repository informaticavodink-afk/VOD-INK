import type { IncomingMessage, ServerResponse } from 'http';
import { signConsentAsArtist } from '../../../server/consents.js';
import { parseBody } from '../../_lib/parseBody.js';

interface SignArtistBody {
  signature?: string;
  driveAccessToken?: string;
}

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
  // Path pattern: /api/consents/<id>/sign-artist
  const match = url.match(/\/api\/consents\/([^/]+)\/sign-artist/);
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
    const { signature, driveAccessToken } = await parseBody<SignArtistBody>(req);

    if (!signature) {
      sendJson(res, 400, { error: 'Falta la firma del tatuador' });
      return;
    }

    const result = await signConsentAsArtist(id, signature, driveAccessToken);
    sendJson(res, 200, result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/sign-artist:', err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno al firmar el consentimiento',
    });
  }
}
