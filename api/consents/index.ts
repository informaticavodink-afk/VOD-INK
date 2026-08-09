import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { generateAndSubmitConsent } from "../../server/consents.js";
import { classifyPublicConsentError, PublicConsentError } from "../../server/publicConsentErrors.js";
import { parseBody } from "../_lib/parseBody.js";
import type { WizardState } from "../../src/types.js";

interface ConsentsPostBody {
	state?: WizardState;
	idempotencyKey?: string;
	driveAccessToken?: string;
}

function setCorsHeaders(res: ServerResponse) {
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
	const body = JSON.stringify(data);
	res.setHeader("Content-Type", "application/json");
	res.statusCode = status;
	res.end(body);
}

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	setCorsHeaders(res);

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}

	if (req.method !== "POST") {
		sendJson(res, 405, { error: "Method Not Allowed" });
		return;
	}

	const correlationId = randomUUID();
	try {
		const { state, idempotencyKey, driveAccessToken } = await parseBody<ConsentsPostBody>(req);
		if (!state || !idempotencyKey) throw new PublicConsentError("SUBMISSION_INVALID", "request");
		const result = await generateAndSubmitConsent(state, idempotencyKey, driveAccessToken);
		sendJson(res, 200, result);
	} catch (err) {
		const failure = classifyPublicConsentError(err, correlationId);
		console.error("[public-consent]", failure.log);
		sendJson(res, failure.status, failure.body);
	}
}
