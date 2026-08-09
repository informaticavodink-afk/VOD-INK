import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	PublicConsentError,
	classifyPublicConsentError,
} from "./publicConsentErrors.js";
import { PublicBoundaryError } from "./publicStudio.js";

const correlationId = "11111111-1111-4111-8111-111111111111";

describe("classifyPublicConsentError", () => {
	it.each([
		["SUBMISSION_INVALID", "validation", 400, false],
		["REPRESENTATION_INVALID", "representation", 422, false],
		["SUBMISSION_CONFLICT", "idempotency", 409, false],
		["SUBMISSION_TEMPORARILY_UNAVAILABLE", "consent-write", 503, true],
		["SUBMISSION_FAILED", "unknown", 500, true],
	] as const)("maps %s to a closed safe envelope", (code, stage, status, retryable) => {
		const result = classifyPublicConsentError(new PublicConsentError(code, stage), correlationId);
		expect(result.status).toBe(status);
		expect(result.body.error).toMatchObject({ code, retryable, correlationId });
		expect(result.body.error.message).toBeTruthy();
		expect(result.log).toEqual({ code, stage, correlationId });
	});

	it.each([
		[
			"ARTIST_NOT_AVAILABLE",
			"SUBMISSION_INVALID",
			"Revisa los datos enviados e inténtalo de nuevo.",
			422,
		],
		[
			"PUBLIC_STUDIO_CONTEXT_INVALID",
			"SUBMISSION_TEMPORARILY_UNAVAILABLE",
			"El estudio público no está disponible. Comprueba el enlace o contacta con el estudio.",
			503,
		],
	] as const)("translates %s while preserving safe boundary semantics", (boundaryCode, code, message, status) => {
		const error = new PublicBoundaryError(boundaryCode);
		const result = classifyPublicConsentError(error, correlationId);
		expect(result).toEqual({
			status,
			body: { error: { code, message, retryable: false, correlationId } },
			log: { code, stage: "request", correlationId },
		});
		expect(result.body.error.message).not.toBe(error.message);
	});

	it("maps Zod failures without exposing issue values", () => {
		const parsed = z.object({ secret: z.literal("allowed") }).safeParse({ secret: "CANARY-PII" });
		const result = classifyPublicConsentError(parsed.error, correlationId);
		expect(result.body.error.code).toBe("SUBMISSION_INVALID");
		expect(JSON.stringify(result)).not.toContain("CANARY-PII");
	});

	it("redacts unknown errors and bounds untrusted correlation IDs", () => {
		const result = classifyPublicConsentError(
			new Error("CANARY-DB CANARY-SIGNATURE CANARY-CREDENTIAL CANARY-PAYLOAD"),
			"x".repeat(500),
		);
		expect(result).toMatchObject({ status: 500, body: { error: { code: "SUBMISSION_FAILED", retryable: true } } });
		expect(result.body.error.correlationId).toBe("unknown");
		expect(JSON.stringify(result)).not.toMatch(/CANARY|database|signature|credential/i);
	});
});
