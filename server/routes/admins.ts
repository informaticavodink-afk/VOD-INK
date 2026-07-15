/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { createServiceClient } from '../supabase';
import { assertCurrentUserIsSuperAdmin, createAdminUser, getErrorMessage } from '../admins';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const serviceClient = createServiceClient();
    await assertCurrentUserIsSuperAdmin(req.supabase!, serviceClient);

    const result = await createAdminUser(req.body, serviceClient);

    return res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      profile: result.profile,
      membership: result.membership,
      organization: result.organization,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === 'No autenticado'
        ? 401
        : message.includes('Solo un super admin')
          ? 403
          : 400;

    console.error('[admins] POST / failed:', error);
    return res.status(status).json({ error: message });
  }
});

export default router;
