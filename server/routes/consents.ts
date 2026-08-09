/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
	cancelConsentAsArtist,
	generateAndSubmitConsent,
	saveConsentTechnique,
	signConsentAsArtist,
	toFinalizationErrorEnvelope,
} from "../consents.js";
import { classifyPublicConsentError, PublicConsentError } from "../publicConsentErrors.js";

const router = Router();

async function requireUserId(req: Express.Request) {
	const { data, error } = await req.supabase!.auth.getUser();
	if (error || !data.user) throw new Error("No autenticado");
	return data.user.id;
}

function getStatus(error: unknown) {
	const message =
		error instanceof Error ? error.message : "Error interno del servidor";
	if (message === "No autenticado") return 401;
	if (message.includes("permisos")) return 403;
	return 400;
}

export async function createConsent(req: Request, res: Response) {
	const correlationId = randomUUID();
	try {
		const { state, idempotencyKey, driveAccessToken } = req.body ?? {};
		if (!state || !idempotencyKey) throw new PublicConsentError("SUBMISSION_INVALID", "request");
		const result = await generateAndSubmitConsent(state, idempotencyKey, driveAccessToken);
		return res.status(200).json(result);
	} catch (err) {
		const failure = classifyPublicConsentError(err, correlationId);
		console.error("[public-consent]", failure.log);
		return res.status(failure.status).json(failure.body);
	}
}

router.post("/", createConsent);

router.patch("/:id/sign-artist", async (req, res) => {
	const { signature, driveAccessToken } = req.body;
	const { id } = req.params;

	if (!signature) {
		return res.status(400).json({ error: "Falta la firma del tatuador" });
	}

	try {
		const userId = await requireUserId(req);
		const result = await signConsentAsArtist(
			id,
			signature,
			userId,
			driveAccessToken,
		);
		return res.status(200).json(result);
	} catch (err) {
		const finalizationError = toFinalizationErrorEnvelope(err);
		if (finalizationError) {
			console.error(`[consents] ${finalizationError.body.error.code}`);
			return res.status(finalizationError.status).json(finalizationError.body);
		}
		console.error("Error en PATCH /api/consents/:id/sign-artist:", err);
		return res.status(getStatus(err)).json({
			error:
				err instanceof Error
					? err.message
					: "Error interno al firmar el consentimiento",
		});
	}
});

router.patch("/:id/technique", async (req, res) => {
	const { techniqueData } = req.body;
	const { id } = req.params;

	if (!techniqueData) {
		return res
			.status(400)
			.json({ error: "Faltan los datos de la intervención (techniqueData)" });
	}

	try {
		const userId = await requireUserId(req);
		const result = await saveConsentTechnique(id, techniqueData, userId);
		return res.status(200).json(result);
	} catch (err) {
		console.error("Error en PATCH /api/consents/:id/technique:", err);
		return res.status(getStatus(err)).json({
			error:
				err instanceof Error
					? err.message
					: "Error interno al guardar los datos de intervención",
		});
	}
});

router.patch("/:id/cancel", async (req, res) => {
	const { id } = req.params;

	try {
		const userId = await requireUserId(req);
		const result = await cancelConsentAsArtist(id, userId);
		return res.status(200).json(result);
	} catch (err) {
		console.error("Error en PATCH /api/consents/:id/cancel:", err);
		return res.status(getStatus(err)).json({
			error:
				err instanceof Error
					? err.message
					: "Error interno al descartar el consentimiento",
		});
	}
});

export default router;
