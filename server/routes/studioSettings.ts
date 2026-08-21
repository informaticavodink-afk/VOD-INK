import { Router, type Request, type Response } from 'express';
import { createServiceClient } from '../supabase.js';
import { getCurrentManagerProfile } from '../admins.js';
import { toStudioSettingsErrorResponse } from '../studioSettingsBoundary.js';
import { getStudioSettings, updateStudioSettings } from '../studioSettings.js';

const router = Router();

export async function readStudioSettings(req: Request, res: Response) {
  try {
    const serviceClient = createServiceClient();
    const profile = await getCurrentManagerProfile(req.supabase!, serviceClient);
    const studio = await getStudioSettings(profile, serviceClient);
    return res.status(200).json({ studio });
  } catch (error) {
    const response = toStudioSettingsErrorResponse(error);
    console.error(`[studio-settings] ${req.method} failed with status ${response.status}`);
    return res.status(response.status).json(response.body);
  }
}

export async function saveStudioSettings(req: Request, res: Response) {
  try {
    const serviceClient = createServiceClient();
    const profile = await getCurrentManagerProfile(req.supabase!, serviceClient);
    const studio = await updateStudioSettings(profile, req.body, serviceClient);
    return res.status(200).json({ studio });
  } catch (error) {
    const response = toStudioSettingsErrorResponse(error);
    console.error(`[studio-settings] ${req.method} failed with status ${response.status}`);
    return res.status(response.status).json(response.body);
  }
}

router.get('/', readStudioSettings);
router.patch('/', saveStudioSettings);

export default router;
