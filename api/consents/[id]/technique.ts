import type { IncomingMessage, ServerResponse } from 'http';
import { saveConsentTechnique } from '../../../server/consents.js';
import { createVercelSupabaseClient } from '../../../utils/supabase/vercel.js';
import { parseBody } from '../../_lib/parseBody.js';

interface TechniqueBody {
  techniqueData?: any;
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

async function requireUserId(req: IncomingMessage, res: ServerResponse) {
  const supabase = createVercelSupabaseClient(req, res);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No autenticado');
  return data.user.id;
}

function getIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  // Path pattern: /api/consents/<id>/technique
  const match = url.match(/\/api\/consents\/([^/]+)\/technique/);
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
    const { techniqueData } = await parseBody<TechniqueBody>(req);

    if (!techniqueData) {
      sendJson(res, 400, { error: 'Faltan los datos de la intervención (techniqueData)' });
      return;
    }

    const userId = await requireUserId(req, res);
    const result = await saveConsentTechnique(id, techniqueData, userId);
    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno al guardar los datos de intervención';
    console.error('Error en PATCH /api/consents/:id/technique:', err);
    sendJson(res, message === 'No autenticado' ? 401 : message.includes('permisos') ? 403 : 400, {
      error: message,
    });
  }
}
