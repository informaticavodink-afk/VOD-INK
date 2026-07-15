import type { IncomingMessage, ServerResponse } from 'http';
import { createServiceClient } from '../../server/supabase.js';
import { createVercelSupabaseClient } from '../../utils/supabase/vercel.js';
import { parseBody } from '../_lib/parseBody.js';
import { createAdminUser, getCurrentManagerProfile, getErrorMessage } from '../../server/admins.js';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
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
    const serviceClient = createServiceClient();
    const userSupabase = createVercelSupabaseClient(req, res);
    const managerProfile = await getCurrentManagerProfile(userSupabase, serviceClient);
    const payload = await parseBody(req);
    const result = await createAdminUser(managerProfile, payload, serviceClient);

    sendJson(res, 201, {
      user: { id: result.user.id, email: result.user.email },
      profile: result.profile,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === 'No autenticado'
        ? 401
        : message.includes('permisos')
          ? 403
          : 400;

    console.error(`[api/admins] ${req.method} ${req.url} failed:`, error);
    sendJson(res, status, { error: message });
  }
}
