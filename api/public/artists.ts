import type { IncomingMessage, ServerResponse } from "node:http";
import { listPublicArtists } from "../../server/publicArtists.js";
import { toPublicBoundaryErrorEnvelope } from "../../server/publicStudio.js";

function sendJson(res: ServerResponse, status: number, data: unknown) {
	res.setHeader("Content-Type", "application/json");
	res.statusCode = status;
	res.end(JSON.stringify(data));
}

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}
	if (req.method !== "GET") {
		sendJson(res, 405, {
			error: {
				code: "METHOD_NOT_ALLOWED",
				message: "Method Not Allowed",
				retryable: false,
			},
		});
		return;
	}

	try {
		sendJson(res, 200, { artists: await listPublicArtists() });
	} catch (error) {
		const boundaryError = toPublicBoundaryErrorEnvelope(error);
		if (boundaryError) {
			console.error(`[public-artists] ${boundaryError.body.error.code}`);
			sendJson(res, boundaryError.status, boundaryError.body);
			return;
		}
		console.error("[public-artists] INTERNAL_ERROR");
		sendJson(res, 500, {
			error: {
				code: "INTERNAL_ERROR",
				message: "Error interno del servidor",
				retryable: false,
			},
		});
	}
}
