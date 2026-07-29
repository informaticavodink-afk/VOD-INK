import { Router, type Request, type Response } from "express";
import { listPublicArtists } from "../publicArtists.js";
import { toPublicBoundaryErrorEnvelope } from "../publicStudio.js";

const router = Router();

export async function getPublicArtists(_req: Request, res: Response) {
	try {
		return res.status(200).json({ artists: await listPublicArtists() });
	} catch (error) {
		const boundaryError = toPublicBoundaryErrorEnvelope(error);
		if (boundaryError) {
			console.error(`[public-artists] ${boundaryError.body.error.code}`);
			return res.status(boundaryError.status).json(boundaryError.body);
		}
		console.error("[public-artists] INTERNAL_ERROR");
		return res.status(500).json({
			error: {
				code: "INTERNAL_ERROR",
				message: "Error interno del servidor",
				retryable: false,
			},
		});
	}
}

router.get("/", getPublicArtists);

export default router;
