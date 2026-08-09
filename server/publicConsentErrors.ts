import { ZodError } from "zod";
import { PublicBoundaryError } from "./publicStudio.js";

const DEFINITIONS = {
	SUBMISSION_INVALID: { status: 400, message: "Revisa los datos enviados e inténtalo de nuevo.", retryable: false },
	REPRESENTATION_INVALID: { status: 422, message: "Revisa los datos de representación legal.", retryable: false },
	SUBMISSION_CONFLICT: { status: 409, message: "La solicitud entra en conflicto con un envío anterior.", retryable: false },
	SUBMISSION_TEMPORARILY_UNAVAILABLE: { status: 503, message: "El servicio no está disponible temporalmente. Vuelve a intentarlo.", retryable: true },
	SUBMISSION_FAILED: { status: 500, message: "No se pudo completar el envío. Vuelve a intentarlo.", retryable: true },
} as const;

export type PublicConsentErrorCode = keyof typeof DEFINITIONS;
export type SafeStage = "request" | "validation" | "representation" | "idempotency" | "consent-write" | "signature-write" | "unknown";

export class PublicConsentError extends Error {
	constructor(readonly code: PublicConsentErrorCode, readonly stage: SafeStage) {
		super(code);
		this.name = "PublicConsentError";
	}
}

const SAFE_CORRELATION = /^[A-Za-z0-9_-]{1,128}$/;

export function classifyPublicConsentError(error: unknown, suppliedCorrelationId: string) {
	const correlationId = SAFE_CORRELATION.test(suppliedCorrelationId) ? suppliedCorrelationId : "unknown";
	let code: PublicConsentErrorCode = "SUBMISSION_FAILED";
	let stage: SafeStage = "unknown";
	if (error instanceof PublicConsentError) ({ code, stage } = error);
	else if (error instanceof ZodError) {
		code = "SUBMISSION_INVALID";
		stage = "validation";
	} else if (error instanceof PublicBoundaryError) {
		code = error.code === "ARTIST_NOT_AVAILABLE" ? "SUBMISSION_INVALID" : "SUBMISSION_TEMPORARILY_UNAVAILABLE";
		stage = "request";
	}
	const definition = DEFINITIONS[code];
	const status = error instanceof PublicBoundaryError ? error.status : definition.status;
	const retryable = error instanceof PublicBoundaryError ? error.retryable : definition.retryable;
	const message = error instanceof PublicBoundaryError && error.code === "PUBLIC_STUDIO_CONTEXT_INVALID"
		? "El estudio público no está disponible. Comprueba el enlace o contacta con el estudio."
		: definition.message;
	return {
		status,
		body: { error: { code, message, retryable, correlationId } },
		log: { code, stage, correlationId },
	};
}
