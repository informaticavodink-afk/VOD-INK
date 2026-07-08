/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { generateAndSubmitConsent, signConsentAsArtist } from '../consents';

const router = Router();

router.post('/', async (req, res) => {
  const { state, idempotencyKey, driveAccessToken } = req.body;

  if (!state || !idempotencyKey) {
    return res.status(400).json({ error: 'Faltan state o idempotencyKey' });
  }

  try {
    const result = await generateAndSubmitConsent(state, idempotencyKey, driveAccessToken);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en /api/consents:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno al procesar el consentimiento',
    });
  }
});

router.patch('/:id/sign-artist', async (req, res) => {
  const { signature, driveAccessToken } = req.body;
  const { id } = req.params;

  if (!signature) {
    return res.status(400).json({ error: 'Falta la firma del tatuador' });
  }

  try {
    const result = await signConsentAsArtist(id, signature, driveAccessToken);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/sign-artist:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno al firmar el consentimiento',
    });
  }
});

export default router;
