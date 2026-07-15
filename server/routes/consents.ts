/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { cancelConsentAsArtist, generateAndSubmitConsent, saveConsentTechnique, signConsentAsArtist } from '../consents';

const router = Router();

async function requireUserId(req: Express.Request) {
  const { data, error } = await req.supabase!.auth.getUser();
  if (error || !data.user) throw new Error('No autenticado');
  return data.user.id;
}

function getStatus(error: unknown) {
  const message = error instanceof Error ? error.message : 'Error interno del servidor';
  if (message === 'No autenticado') return 401;
  if (message.includes('permisos')) return 403;
  return 400;
}

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
    const userId = await requireUserId(req);
    const result = await signConsentAsArtist(id, signature, userId, driveAccessToken);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/sign-artist:', err);
    return res.status(getStatus(err)).json({
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
    const userId = await requireUserId(req);
    const result = await saveConsentTechnique(id, techniqueData, userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/technique:', err);
    return res.status(getStatus(err)).json({
      error: err instanceof Error ? err.message : 'Error interno al guardar los datos de intervención',
    });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    const userId = await requireUserId(req);
    const result = await cancelConsentAsArtist(id, userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en PATCH /api/consents/:id/cancel:', err);
    return res.status(getStatus(err)).json({
      error: err instanceof Error ? err.message : 'Error interno al descartar el consentimiento',
    });
  }
});

export default router;
