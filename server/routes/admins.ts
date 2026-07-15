/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { createServiceClient } from '../supabase';
import { createAdminUser, getCurrentManagerProfile, getErrorMessage } from '../admins';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const serviceClient = createServiceClient();
    const managerProfile = await getCurrentManagerProfile(req.supabase!, serviceClient);
    const result = await createAdminUser(managerProfile, req.body, serviceClient);

    return res.status(201).json({
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

    console.error('[admins] POST / failed:', error);
    return res.status(status).json({ error: message });
  }
});

export default router;
