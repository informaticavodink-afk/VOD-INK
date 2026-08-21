import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServiceClient } from '../server/supabase.js';
import { getCurrentManagerProfile } from '../server/admins.js';
import { toStudioSettingsErrorResponse } from '../server/studioSettingsBoundary.js';
import { getStudioSettings, updateStudioSettings } from '../server/studioSettings.js';
import { createVercelSupabaseClient } from '../utils/supabase/vercel.js';
import { parseBody } from './_lib/parseBody.js';

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'GET, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const serviceClient = createServiceClient();
    const authClient = createVercelSupabaseClient(req, res);
    const profile = await getCurrentManagerProfile(authClient, serviceClient);
    const studio = req.method === 'GET'
      ? await getStudioSettings(profile, serviceClient)
      : await updateStudioSettings(profile, await parseBody(req), serviceClient);

    sendJson(res, 200, { studio });
  } catch (error) {
    const response = toStudioSettingsErrorResponse(error);
    console.error(`[api/studio-settings] ${req.method} failed with status ${response.status}`);
    sendJson(res, response.status, response.body);
  }
}
