/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { cancelConsentAsArtist, generateAndSubmitConsent, saveConsentTechnique, signConsentAsArtist } from '../consents';

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

router.patch('/:id/technique', async (req, res) => {
  const { techniqueData } = req.body;
  const { id } = req.params;

  if (!techniqueData) {
    return res.status(400).json({ error: 'Faltan los datos de la intervención (techniqueData)' });
  }

  try {
    const result = await saveConsentTechnique(id, techniqueData);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/technique:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno al guardar los datos de intervención',
    });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await cancelConsentAsArtist(id);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/cancel:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno al descartar el consentimiento',
    });
  }
});

export default router;
