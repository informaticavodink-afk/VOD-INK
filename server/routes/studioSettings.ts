import { Router, type Request, type Response } from 'express';
import { createServiceClient } from '../supabase.js';
import { getCurrentManagerProfile, getErrorMessage } from '../admins.js';
import { getStudioSettings, updateStudioSettings } from '../studioSettings.js';

const router = Router();

function statusFor(message: string) {
  if (message === 'No autenticado') return 401;
  if (message.includes('permisos') || message.includes('FORBIDDEN')) return 403;
  if (message.includes('no encontró')) return 404;
  return 400;
}

export async function readStudioSettings(req: Request, res: Response) {
  try {
    const serviceClient = createServiceClient();
    const profile = await getCurrentManagerProfile(req.supabase!, serviceClient);
    const studio = await getStudioSettings(profile, serviceClient);
    return res.status(200).json({ studio });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('[studio-settings] GET failed:', error);
    return res.status(statusFor(message)).json({ error: message });
  }
}

export async function saveStudioSettings(req: Request, res: Response) {
  try {
    const serviceClient = createServiceClient();
    const profile = await getCurrentManagerProfile(req.supabase!, serviceClient);
    const studio = await updateStudioSettings(profile, req.body, serviceClient);
    return res.status(200).json({ studio });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('[studio-settings] PATCH failed:', error);
    return res.status(statusFor(message)).json({ error: message });
  }
}

router.get('/', readStudioSettings);
router.patch('/', saveStudioSettings);

export default router;
